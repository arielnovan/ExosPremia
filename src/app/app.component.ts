import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


interface ApiResponse {
  ticket: number;
  cedula?: string;
  nombre: string;
  telefono?: string;
  direccion?: string;
  estacion?: string;
  sucursal?: string;
  premio: string; // Premio obtenido de la respuesta de la API
  cedulasegura : string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ExosPremia';
  
  options = [
    { label: 'Seleccione...', value: '' },
    { label: 'Rio Frio', value: 'ERF' },
    { label: 'Horquetas', value: 'EHO' },
    { label: 'Poasito', value: 'EPO' },
    { label: 'Los Chiles', value: 'ELC' }
  ];
  
  selectedOption: string = this.options[0].value;
  resultado: ApiResponse[] = [];
  isLoading: boolean = false;
  showConfetti: boolean = false;
  ganadores: any[] = []; // Lista completa de 12 ganadores
  ganadoresVisibles: any[] = []; // Lista visible en el índice, solo 6
  ganadores2: any[] = [];
  private apiUrl = 'http://127.0.0.1:3011/premia';
  
  
  constructor(private http: HttpClient) {}
  
  generate() {
    this.isLoading = true;
    this.showConfetti = false;
    this.resultado = []; // Limpiar resultado antes de llenarlo
    this.ganadores = [];
    this.ganadoresVisibles = [];
    const cedulasPremiadas = new Set<string>(); // Conjunto para cédulas premiadas
    
    const url = `${this.apiUrl}/${this.selectedOption}`;
    console.log(url);
  
    // Realizamos una única petición para obtener los 12 ganadores
    this.http.get<ApiResponse[]>(url).subscribe({
      next: (responses) => {
        setTimeout(() => {
          this.isLoading = false;
          this.showConfetti = true;
          setTimeout(() => {
            this.showConfetti = false;
          }, 3000);
  
          // Verifica cuántos ganadores llegaron en la respuesta
          if (responses.length < 12) {
            console.warn(`Se obtuvieron solo ${responses.length} ganadores, se esperaban 12.`);
          }
  
          let tipoPremioIndex = 0;
  
          // Procesamos los ganadores que llegaron
          responses.forEach((response) => {
            if (!response) {
              return;
            }
          
            // Verificar si la cédula ya fue premiada (aseguramos que no sea undefined)
            if (response.cedula && cedulasPremiadas.has(response.cedula)) {
              return; // Si la cédula ya está en el conjunto, no agregamos al ganador
            }
          
            // Asignamos el tipo de ganador (1 para los primeros 6, 2 para los siguientes 6)
            const tipoAsignado = tipoPremioIndex < 6 ? '1' : '2';
          
            const cedulaSinEspacios = response.cedula?.replace(/\s+/g, '') || '';
            const cedulaCensurada = cedulaSinEspacios.slice(0, -4).padEnd(cedulaSinEspacios.length, '*');
          
            const ganador = {
              ticket: response.ticket,
              nombre: response.nombre,
              telefono: response.telefono,
              direccion: response.direccion,
              cedula: cedulaSinEspacios, // Cédula completa para procesar
              cedulasegura: cedulaCensurada, // Cédula censurada para mostrar
              estacion: response.estacion,
              premio: response.premio,
              tipo: tipoAsignado
            };
          
            // Generar un índice aleatorio dentro del rango del array actual
  const randomIndex = Math.floor(Math.random() * (this.ganadores.length + 1));

  // Insertar el ganador en una posición aleatoria
  this.ganadores.splice(randomIndex, 0, ganador);
          
            // Agregar la cédula al conjunto de premiados
            if (response.cedula) { // Comprobamos que la cédula no sea undefined
              cedulasPremiadas.add(response.cedula);
            }
          
            tipoPremioIndex++;
          });
  
          // Filtrar solo los ganadores de Tipo 1 y asignarlos a "resultado"
          this.resultado = this.ganadores.filter(ganador => ganador.tipo === '1');
          // Acumula los elementos de ganadores en ganadores2
this.ganadores2.push(...this.ganadores);
// Guardar los 12 ganadores
          this.asignarPremio(this.ganadores);
        }, 10000);
      },
      error: (err) => {
        console.error('Error al llamar a la API:', err);
        this.isLoading = false;
      }
    });
  }
  
  
  
  
  

  asignarPremio(ganadores: any[]) {
    ganadores.forEach(ganador => {
      const data = {
        nombre: ganador.nombre,
        ticket: ganador.ticket,
        sucursal: this.selectedOption,
        tipo: ganador.tipo,
        premioNombre: ganador.premio
      };

      this.http.post<any>(`${this.apiUrl}/asignar`, data).subscribe({
        next: (res) => {
        //  console.log('Premio asignado:', res);
        },
        error: (err) => {
          console.error('Error al asignar el premio:', err);
        }
      });
    });

  }

  
  exportToExcel(): void {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ganadores');
  
    // Configuración de encabezados en la fila 1, 2, y 3
    worksheet.getCell('B1').value = 'Premiados';
    worksheet.getCell('B1').font = { bold: true, size: 14 };
    worksheet.getCell('B1').alignment = { horizontal: 'center' };
  
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()} ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;
  
    worksheet.getCell('B2').value = `Fecha: ${formattedDate}`;
    worksheet.getCell('B2').font = { size: 12 };
    worksheet.getCell('B2').alignment = { horizontal: 'center' };
  
    worksheet.getCell('B3').value = 'Estaciones JYJ';
    worksheet.getCell('B3').font = { size: 12 };
    worksheet.getCell('B3').alignment = { horizontal: 'center' };
  
    // Encabezados de la tabla en la fila 6
    worksheet.getCell('A6').value = 'Ticket';
    worksheet.getCell('B6').value = 'Nombre';
    worksheet.getCell('C6').value = 'Teléfono';
    worksheet.getCell('D6').value = 'Dirección';
    worksheet.getCell('E6').value = 'Cédula';
    worksheet.getCell('F6').value = 'Estación';
    worksheet.getCell('G6').value = 'Premio';
    worksheet.getCell('H6').value = 'Tipo';
  
    // Aplicando estilo a los encabezados
    const headerRow = worksheet.getRow(6);
    headerRow.eachCell((cell) => {
      cell.style = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D3D3D3' } },
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle' },
      };
    });
  
    // Configuración de las columnas **ANTES** de agregar las filas
    worksheet.columns = [
      { key: 'ticket', width: 10 },
      { key: 'nombre', width: 30 },
      { key: 'telefono', width: 25 },
      { key: 'direccion', width: 75 },
      { key: 'cedula', width: 15 },
      { key: 'estacion', width: 20 },
      { key: 'premio', width: 20 },
      { key: 'tipo', width: 15 }
    ];
  
    // Comprobando los datos en ganadores2 antes de agregar las filas
    console.log('Contenido de ganadores2:', this.ganadores2);
  
    // Verificar que ganadores2 contiene datos
    if (this.ganadores2 && this.ganadores2.length > 0) {
      const rows = this.ganadores2.map(g => {
        return {
          ticket: g.ticket,
          nombre: g.nombre,
          telefono: g.telefono,
          direccion: g.direccion,
          cedula: g.cedula,
          estacion: g.estacion,
          premio: g.premio,
          tipo: g.tipo === '1' ? 'Principal' : 'Secundario',
        };
      });
  
      console.log('Datos que se agregarán a la hoja:', rows);  // Mostrar los datos que se agregarán al archivo Excel
  
      worksheet.addRows(rows);  // Agregar las filas a la hoja de Excel
    } else {
      console.log('No hay datos en ganadores2.');
    }
  
    // Guardar el archivo Excel
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'ganadores.xlsx');
    });
  }
  
  
  
}
  
  
  
  
  
  
  
  
  
  
  
  
  
  
