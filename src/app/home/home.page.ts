import { Restaurante } from './../interface/restaurante';
import { Component, signal, computed, inject } from '@angular/core';
import restaurantesJSON from '../../assets/datos/restaurantes.json';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {

  // ############################### REGION DATOS ###############################

  // TODO - Inyectamos el controlador de toasts para mostrar mensajes al usuario
  toastController: ToastController = inject(ToastController);
  // Lista completa de restaurantes leída del JSON en tiempo de compilación
  restaurantes: Restaurante[] = restaurantesJSON as Restaurante[];

  // Signal principal con los restaurantes actualmente cargados (vacío hasta que el usuario pulsa "Cargar datos")
  restaurantesCargados = signal<Restaurante[]>([]);

  // TODO - true cuando hay al menos un restaurante cargado.
  // Habrá que usar un computed para controlar si restaurantesCargados tiene elementos o no.
  hayDatos = false;

  // TODO - Carga la lista completa en el signal y muestra un toast de confirmación
  cargarDatos() {
    // Cargamos los datos en el signal mediante set()
    
    this.restaurantesCargados.set(this.restaurantes);
    if (this.restaurantesCargados().length > 0) {
      this.hayDatos = true;
    }
    // Mostramos un toast de confirmación con el número de restaurantes cargados
    this.mostrarToast("Se han cargado " + this.restaurantesCargados().length + " restaurantes.", this.restaurantesCargados().length > 0 ? "success" : "warning");
    
  }

  // TODO -Muestra un toast con el mensaje y color indicados
  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message : mensaje,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }


  // ############################### REGION FILTROS (estado general) ###############################

  textoBusqueda = signal('');
  hayFiltrosActivos = computed(() => {
    return (!!this.textoBusqueda() || !!this.territorioSeleccionado() || this.localidadesSeleccionadas.length > 0);
  });

  limpiarTodosFiltros() {
    this.textoBusqueda.set('');
    this.territorioSeleccionado.set('');
    this.localidadesSeleccionadas.set([]);
  }
  // ############################### REGION TERRITORIOS ###############################

  territorioSeleccionado = signal('');

  // TODO - Lista de territorios únicos disponibles, ordenada alfabéticamente
  // Se obtiene a partir de los restaurantes cargados y se usa un computed para recalcularla cuando cambian los datos.
  // PISTA: Mediante map() podemos crear un array de string[] con cada territorio de cada restaurante. Ejemplo: ["Bizkaia", "Gipuzkoa", "Bizkaia", "Araba", "Gipuzkoa"]
  //        Luego mediante Set() podemos eliminar duplicados y finalmente mediante Array.from() podemos volver a convertirlo en un array para devolverlo ordenado alfabéticamente mediante sort().
  territoriosFiltrados = computed(() => {
    return Array.from(new Set(this.restaurantesCargados().map(r => r.territory))).sort();
  });

  // TODO - Actualiza el territorio seleccionado y elimina las localidades que ya no pertenecen a él
  onTerritorioChange(value: string) {
    // Actualizamos el territorio seleccionado
    this.territorioSeleccionado.set(value);
    // Filtra las localidades ya seleccionadas, quedándose solo con las que siguen siendo válidas para el nuevo territorio.
    // PISTA: Podemos usar filter() para quedarnos solo con las localidades que están en la lista de localidades filtradas por territorio y includes() para comprobar si una localidad está en esa lista.
    // Por ejemplo, si el usuario tenía seleccionadas las localidades ["Bilbao", "Donostia"] y cambia el territorio a "Araba", la localidad "Bilbao" ya no es válida y debe eliminarse de la lista de localidades seleccionadas.
    
    let lista : string[] = this.localidadesSeleccionadas().filter( l => this.localidadesFiltradasPorTerritorio().includes(l));
    // Actualizamos las localidades seleccionadas con las nuevas localidades válidas
    this.localidadesSeleccionadas.set(lista);
  }

  // ############################### REGION LOCALIDADES ###############################

  localidadesSeleccionadas = signal<string[]>([]);

  // TODO - Lista de localidades únicas del territorio seleccionado (o de todos si no hay territorio), ordenada alfabéticamente
  // Se obtiene a partir de los restaurantes cargados y se usa un computed para recalcularla cuando cambian los datos o el territorio seleccionado.
  // PISTA: Haremos uso de la lista de restaurantes, si hay un territorio seleccionado filtraremos por él y luego obtendremos las localidades únicas de los restaurantes restantes, eliminando duplicados y ordenando alfabéticamente.
  localidadesFiltradasPorTerritorio = computed(() => {
    // Obtenemos la lista de restaurantes cargados, siendo lista un array de objetos Restaurante.
    let lista: Restaurante[] = this.restaurantesCargados();
    // Para el territorio la pasaremos a minúsculas y eliminaremos espacios al principio y al final para evitar problemas de coincidencia, mediante toLowerCase() y trim().
    const territorio = this.territorioSeleccionado().trim().toLowerCase();
    // Si hay un territorio seleccionado, filtramos la lista de restaurantes por él
    if (territorio) {
      // Filtramos la lista de restaurantes para quedarnos solo con los que tienen el territorio seleccionado, usando filter() y comparando el territorio del restaurante con el territorio seleccionado.
      lista = lista.filter(r => r.territory.trim().toLowerCase() == territorio);
    }

    // RESUELTO: Obtenemos la lista de localidades únicas de los restaurantes restantes, eliminando duplicados y ordenando alfabéticamente.
    /* Explicación: locality puede ser undefined, null o un string. Mediante ? de r.locality? le decimos que si es undefined o null no haga nada y devuelva undefined, 
     *              si tiene valor entonces le aplicamos trim() para eliminar espacios al principio y al final.
     *              
     *              !! (doble negación) convierte cualquier valor a boolean. Si locality es undefined, null o un string vacío, !! lo convierte a false. Si tiene valor, !! lo convierte a true.
     *              Por tanto, r => !!r.locality?.trim() devuelve true si locality tiene valor y no es un string vacío, y false en caso contrario. De esta forma filtramos la lista de restaurantes para quedarnos 
     *              solo con los que tienen localidad válida.
     * 
     *              Luego mediante map() obtenemos un array de string[] con las localidades, usando r.locality!.trim() para obtener el valor de locality (el ! le dice a TypeScript que estamos seguros de que no es undefined) 
     *              y aplicando trim() para eliminar espacios al principio y al final.  
     */                  
    const localities = lista.filter(r => !!r.locality?.trim()).map(r => r.locality!.trim());

    //Finalmente mediante Set() eliminamos duplicados y Array.from() lo convertimos de nuevo en un array, que ordenamos alfabéticamente mediante sort(). 
    
    return Array.from(new Set(localities)).sort();
  });

  // TODO - Actualiza las localidades seleccionadas con los valores del evento
  onLocalidadesChange(value: string[]) {
    this.localidadesSeleccionadas.set(value);
  }

  // ############################### REGION RESULTADOS ###############################

  // TODO - Lista filtrada de restaurantes según todos los filtros activos
  restaurantesFiltrados = computed(() => {

    // Obtenemos la lista de restaurantes cargados, siendo lista un array de objetos Restaurante.

    // Filtramos la lista de restaurantes según el texto de búsqueda, el territorio seleccionado y las localidades seleccionadas.
    // PISTA: Habrá que hacer uso de icludes() para comprobar si el texto de búsqueda está en el nombre del restaurante, si el territorio del restaurante coincide con el territorio seleccionado 
    //        y si la localidad del restaurante está en la lista de localidades seleccionadas.
    //        Habrá que hacer uso de filter() para filtrar la lista de restaurantes según cada uno de los filtros activos.

    //textoBusqueda
    const nombre = this.textoBusqueda().trim().toLowerCase();
    
    //territorioSeleccionado
    const territorio = this.territorioSeleccionado();
    //localidadesSeleccionadas
    const localidad = this.localidadesSeleccionadas();
    //Devuelve la lista filtrada de restaurantes
    return this.restaurantes.filter(r =>
      (!!nombre ? r.documentName.toLowerCase().includes(nombre) : true) && (!!territorio? r.territory == territorio: true) && (localidad.length > 0 ? localidad.includes(r.locality) : true)
    );
  });

  // ############################### REGION AUXILIARES ###############################

  // Devuelve el número de estrellas Michelin (0 si no tiene o el valor no es numérico)
  estrellasMichelin(r : Restaurante) {
    return this.evaluarStringComoInt(r.michelinStar);
  }

  // Devuelve el número de soles Repsol (0 si no tiene o el valor no es numérico)
  repsolSoles(r : Restaurante) {
    return this.evaluarStringComoInt(r.repsolSun);
  }

  evaluarStringComoInt(value : string) {
    //console.log(value + ' ' + Number.isInteger(value) + ' ' + Number.parseInt(value));
    if (!Number.isInteger(parseInt(value))) return 0;
    return Number.parseInt(value); 
  }
}