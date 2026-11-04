# Sistema de Asistencia - Microservicios Spring Boot + MySQL

Sistema compuesto por **3 microservicios independientes** desarrollados con **Java 17** y
**Spring Boot 3.5.x**, cada uno con su propia base de datos **MySQL** (administrable desde SQLyog).

| Microservicio        | Puerto | Base de datos        | Paquete base                                |
|----------------------|--------|----------------------|---------------------------------------------|
| `alumno-service`     | 8081   | `alumno_db`          | `com.tecsup.asistencia.alumno`              |
| `sesion-service`     | 8082   | `sesion_db`          | `com.tecsup.asistencia.sesion`              |
| `asistencia-service` | 8083   | `asistencia_db`      | `com.tecsup.asistencia.asistencia`          |

Cada servicio sigue una arquitectura por capas:

```
controller -> service (interface) -> service.impl -> repository (JPA) -> entity
                     |
                     +-> dto (request / response con Bean Validation)
                     +-> exception (GlobalExceptionHandler)
```

## Requisitos

- JDK 17 o superior (`java -version`)
- Maven 3.9 o superior (`mvn -v`)
- MySQL en ejecución (puerto `3306`) y las bases `alumno_db`, `sesion_db` y `asistencia_db`

Configura las credenciales antes de iniciar los servicios. En PowerShell:

```powershell
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "tu_clave_de_mysql"
```

En SQLyog, ejecuta [`database/sqlyog-init.sql`](database/sqlyog-init.sql) para crear las tres bases y cargar datos de ejemplo (6 alumnos, 5 sesiones y 13 asistencias). Si MySQL no tiene clave para `root`, puedes omitir `DB_PASSWORD`.

Por defecto, los servicios se conectan a `localhost:3306`. Puedes cambiar la URL por servicio con
`ALUMNO_DB_URL`, `SESION_DB_URL` o `ASISTENCIA_DB_URL`.

> El `pom.xml` compila con `release 17`, por lo que el codigo es compatible con Java 17
> aunque se ejecute sobre una JDK mas reciente.

## Estructura del repositorio

```
evaluacion03/
|-- frontend/                 (panel web: HTML + CSS + JavaScript)
|   |-- index.html
|   |-- css/styles.css
|   `-- js/app.js
|-- alumno-service/
|   |-- pom.xml
|   `-- src/main/
|       |-- java/com/tecsup/asistencia/alumno/
|       |   |-- AlumnoServiceApplication.java
|       |   |-- config/WebConfig.java
|       |   |-- controller/AlumnoController.java
|       |   |-- dto/AlumnoRequestDTO.java
|       |   |-- dto/AlumnoResponseDTO.java
|       |   |-- entity/Alumno.java
|       |   |-- exception/ErrorResponse.java
|       |   |-- exception/GlobalExceptionHandler.java
|       |   |-- exception/ResourceNotFoundException.java
|       |   |-- exception/DuplicateResourceException.java
|       |   |-- repository/AlumnoRepository.java
|       |   |-- service/AlumnoService.java
|       |   `-- service/impl/AlumnoServiceImpl.java
|       `-- resources/application.yml
|-- sesion-service/          (misma estructura, paquete ...sesion)
|-- asistencia-service/      (misma estructura, paquete ...asistencia)
|   `-- src/main/resources/static/   (copia empaquetada del panel web)
|-- README.md
`-- .gitignore
```

## Ejecucion

Cada microservicio se ejecuta de forma independiente. Abrir una terminal por servicio:

```bash
# Terminal 1 - Alumnos
cd alumno-service
mvn spring-boot:run

# Terminal 2 - Sesiones
cd sesion-service
mvn spring-boot:run

# Terminal 3 - Asistencias
cd asistencia-service
mvn spring-boot:run
```

Tambien se puede empaquetar y ejecutar el JAR:

```bash
cd alumno-service
mvn clean package
java -jar target/alumno-service-1.0.0.jar
```

Al iniciar por primera vez, Hibernate crea las tablas en la base de datos MySQL
correspondiente. Las bases deben existir previamente en la instancia.

## Panel web

`asistencia-service` sirve un panel de gestión en **http://localhost:8083/** (con los tres
servicios en ejecución). El panel incluye:

- **Dashboard** con indicadores, distribución de asistencia (presente / tardanza / falta),
  actividad por fecha, últimos registros y próximas sesiones.
- **CRUD visual** de alumnos, sesiones y asistencias con formularios validados, búsqueda,
  filtros y confirmación de borrado.
- **Historial de asistencia por alumno**: se abre desde el icono de historial en la tabla de
  alumnos (o desde cualquier registro de asistencia). Muestra totales por estado, porcentaje de
  asistencia, distribución visual, filtro por periodo (todo / mes actual / 30 / 90 días),
  detalle con curso y horario, y exportación a CSV.
- **Exportación a CSV** de cada listado.
- **Tema claro / oscuro** persistido en el navegador y diseño adaptable a móvil.
- **Monitor de servicios**: indicador del estado de los puertos 8081, 8082 y 8083.

El código fuente del panel vive en `frontend/` (se puede editar y recargar el navegador sin
recompilar, porque `application.yml` lo sirve como ubicación estática principal). También se
empaqueta una copia en `asistencia-service/src/main/resources/static/`, de modo que el JAR
funciona aunque se ejecute en otra ubicación.

Los tres servicios habilitan CORS para `/api/**` mediante `config/WebConfig.java`, ya que el
panel se sirve desde el puerto 8083 y consume APIs de los puertos 8081 y 8082.

## Endpoints

### alumno-service (8081)

| Metodo | Ruta                            | Descripcion                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/api/alumnos`                  | Lista alumnos (`?buscar=texto`)      |
| GET    | `/api/alumnos/{id}`             | Obtiene un alumno por id             |
| GET    | `/api/alumnos/codigo/{codigo}`  | Obtiene un alumno por codigo         |
| POST   | `/api/alumnos`                  | Crea un alumno                       |
| PUT    | `/api/alumnos/{id}`             | Actualiza un alumno                  |
| DELETE | `/api/alumnos/{id}`             | Elimina un alumno                    |

### sesion-service (8082)

| Metodo | Ruta                              | Descripcion                                      |
|--------|-----------------------------------|--------------------------------------------------|
| GET    | `/api/sesiones`                   | Lista sesiones (`?curso=`, `?fecha=`)            |
| GET    | `/api/sesiones?desde=&hasta=`     | Lista sesiones en un rango de fechas             |
| GET    | `/api/sesiones/{id}`              | Obtiene una sesion por id                        |
| GET    | `/api/sesiones/curso/{codigo}`    | Lista sesiones de un curso                       |
| POST   | `/api/sesiones`                   | Crea una sesion                                  |
| PUT    | `/api/sesiones/{id}`              | Actualiza una sesion                             |
| DELETE | `/api/sesiones/{id}`              | Elimina una sesion                               |

### asistencia-service (8083)

| Metodo | Ruta                                  | Descripcion                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/asistencias`                    | Lista todas las asistencias          |
| GET    | `/api/asistencias/{id}`               | Obtiene una asistencia por id        |
| GET    | `/api/asistencias/alumno/{idAlumno}`  | Lista asistencias de un alumno       |
| GET    | `/api/asistencias/sesion/{idSesion}`  | Lista asistencias de una sesion      |
| POST   | `/api/asistencias`                    | Registra una asistencia              |
| PUT    | `/api/asistencias/{id}`               | Actualiza una asistencia             |
| DELETE | `/api/asistencias/{id}`               | Elimina una asistencia               |

## Ejemplos de uso (curl)

### Crear un alumno

```bash
curl -X POST http://localhost:8081/api/alumnos \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "20260001",
    "nombres": "Alumno Demo Uno",
    "apellidos": "Ejemplo Uno",
    "correo": "alumno1@example.invalid",
    "estado": true
  }'
```

### Crear una sesion

```bash
curl -X POST http://localhost:8082/api/sesiones \
  -H "Content-Type: application/json" \
  -d '{
    "codigoCurso": "ISW-101",
    "nombreCurso": "Ingenieria de Software",
    "fecha": "2026-11-04",
    "horaInicio": "08:00:00",
    "horaFin": "10:00:00"
  }'
```

### Registrar una asistencia

```bash
curl -X POST http://localhost:8083/api/asistencias \
  -H "Content-Type: application/json" \
  -d '{
    "idAlumno": 1,
    "idSesion": 1,
    "fecha": "2026-11-04",
    "estado": "PRESENTE"
  }'
```

### Consultar asistencias por alumno

```bash
curl http://localhost:8083/api/asistencias/alumno/1
```

## Validaciones y manejo de errores

- Los DTO de entrada usan Bean Validation (`@NotBlank`, `@Email`, `@NotNull`, `@Positive`, `@Size`).
- `GlobalExceptionHandler` responde con un JSON uniforme:

```json
{
  "timestamp": "2026-11-04T10:15:30.123",
  "status": 400,
  "error": "Bad Request",
  "message": "Error de validacion en la peticion",
  "path": "/api/alumnos",
  "details": {
    "correo": "El correo no tiene un formato valido"
  }
}
```

| Situacion                                        | Codigo HTTP |
|--------------------------------------------------|-------------|
| Recurso no encontrado                            | 404         |
| Datos invalidos / JSON mal formado               | 400         |
| Codigo de alumno duplicado / registro duplicado  | 409         |
| Error interno                                    | 500         |

## Configuracion MySQL

Cada `application.yml` define:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/nombre_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Lima
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
    hibernate:
      ddl-auto: update
    show-sql: true
```

El pool Hikari permite hasta **10 conexiones** por servicio. Los scripts `schema.sql` crean
de forma idempotente índices únicos para el código del alumno y para la combinación
`(id_alumno, id_sesion, fecha)` de las asistencias.

`alumno-service` define en su propio `schema.sql` el índice único `uk_alumno_codigo` sobre
`alumnos(codigo)`, garantizando la unicidad también a nivel de BD.

## Consideraciones de diseno

- Cada microservicio es autonomo y tiene su propia base de datos (patron database-per-service).
- `asistencia-service` almacena `idAlumno` e `idSesion` como **referencias logicas**; no hay
  claves foraneas entre bases de datos. Una evolucion natural es validar esos ids mediante
  llamadas HTTP a los otros servicios o mediante mensajeria asincrona.
- Se agregaron endpoints de busqueda y filtrado (por codigo, curso, fecha, alumno y sesion)
  ademas del CRUD solicitado.
