# Auditoría técnica — Sistema de Asistencia (3 microservicios + panel web)

**Fecha:** 2026-11-03  
**Modalidad:** auditoría de solo lectura (no se modificó código ni configuración)  
**Alcance:** `alumno-service` (8081), `sesion-service` (8082), `asistencia-service` (8083), panel web y las tres bases SQLite.  
**Entorno auditado:** Windows, JDK 25 en ejecución, compilación `release 17`, Spring Boot 3.5.16, Hibernate 6.6.53.Final, `sqlite-jdbc` 3.54.1.0, Tomcat 10.1.55.

---

## 1. Veredicto

El sistema **funciona de extremo a extremo** y cumple la consigna académica: tres microservicios independientes, una SQLite por servicio, arquitectura por capas, DTO con Bean Validation, CRUD completo, manejo centralizado de errores y un panel web con historial por alumno. La calidad del frontend es notablemente superior al promedio de este tipo de entregas.

Sin embargo, **no está listo para un entorno real o multiusuario**. Los problemas más serios son de integridad de datos y de seguridad, no de funcionalidad visible: se aceptan asistencias de alumnos/sesiones inexistentes, borrar un alumno deja registros huérfanos, la fecha de la asistencia puede no coincidir con la sesión, y cualquier origen web puede leer y escribir en las APIs sin autenticación.

| Área | Nota | Comentario |
|---|---:|---|
| Arquitectura y organización | 9/10 | Capas claras, paquetes consistentes, sin Lombok, transacciones correctas |
| CRUD y API REST | 7/10 | Completo, con `Location` en 201; sin paginación ni versionado |
| Validación de entrada | 7/10 | Bean Validation correcta; faltan reglas de negocio e integridad |
| Integridad de datos | 4/10 | Sin FK entre servicios, huérfanos, IDs reutilizables, fechas incoherentes |
| Seguridad | 3/10 | Sin autenticación, CORS `*`, escucha en todas las interfaces, sin cabeceras |
| Manejo de errores | 5/10 | Bien para validación/404/409; 404/405/415 se convierten en 500 |
| Pruebas automatizadas | 1/10 | No existe `src/test`; `mvn test` responde “No tests to run.” |
| UI / UX | 8/10 | Dashboard, filtros, CSV, modales, responsive, tema claro/oscuro |
| Accesibilidad | 8/10 | Buenas etiquetas y roles; contraste insuficiente en tema oscuro |
| Documentación | 8/10 | `README.md` claro y completo |
| Operación / despliegue | 4/10 | Sin perfiles, health check, CI ni Docker; configuración de desarrollo activa |

> **Nota global:** 5,8/10 como sistema listo para producción; **8,5/10 como proyecto académico**. El veredicto bajo no implica que esté “roto”, sino que hay que cerrar brechas antes de exponerlo.

---

## 2. Metodología

1. **Revisión estática** de los 3 `pom.xml`, `application.yml`, `schema.sql`, 30 archivos Java, `frontend/index.html`, `frontend/css/styles.css` y `frontend/js/app.js`.
2. **Pruebas HTTP reales** contra los servicios en ejecución: casos felices, errores de validación, métodos no soportados, content-types incorrectos, duplicados, CORS y filtros.
3. **Inspección directa de SQLite** con Python: tablas, índices, restricciones, tipos y conteo de filas.
4. **Pruebas de integridad**: alta de asistencia con IDs inexistentes, borrado de alumno con asistencias, duplicados con distinta fecha y reutilización de IDs.
5. **Revisión del panel** en navegador: flujo de alta de asistencia, historial por alumno, filtros y exportación.
6. **Lighthouse** sobre el dashboard (accesibilidad, buenas prácticas y SEO).
7. **Build y pruebas**: `mvn test` en `alumno-service`; verificación de versiones resueltas.

Los registros temporales creados durante las pruebas fueron eliminados. Estado final verificado: **6 alumnos, 5 sesiones y 13 asistencias**.

---

## 3. Cumplimiento de requisitos

| Requisito | Estado | Observación |
|---|---|---|
| 3 microservicios con puertos 8081/8082/8083 | ✅ | Verificado en ejecución |
| Una base SQLite independiente por servicio | ✅ | `alumno_db.db`, `sesion_db.db`, `asistencia_db.db` |
| Capas Entity, DTO, Repository, Service + impl, Controller | ✅ | Consistente en los tres servicios |
| DTO con validaciones | ✅ | `@NotBlank`, `@NotNull`, `@Positive`, `@Email`, `@Size` |
| CRUD completo | ✅ | GET/POST/PUT/DELETE en los tres recursos |
| `GlobalExceptionHandler` | ⚠️ | Existe, pero el `catch (Exception)` tapa 404/405/415 |
| Entidades y campos pedidos | ✅ | Incluye estado de asistencia como enum |
| Panel web profesional | ✅ | Dashboard, KPIs, gráficos, filtros, CSV, temas, responsive |
| Historial de asistencia por alumno | ✅ | Modal con estadísticas, distribución, periodos y exportación |
| Pruebas automatizadas | ❌ | No hay tests |

---

## 4. Hallazgos

**Escala de severidad**

- **ALTO:** afecta integridad, seguridad o correctitud; debe corregirse antes de usar datos reales.
- **MEDIO:** degrada robustez, mantenibilidad u operación; corregir antes de producción.
- **BAJO:** mejora puntual de calidad, accesibilidad u operación.

### ALTO-01 — APIs sin autenticación, CORS abierto y expuestas en todas las interfaces

**Evidencia**

- `WebConfig` de los tres servicios: `allowedOriginPatterns("*")`, `allowedMethods("GET","POST","PUT","DELETE","OPTIONS")`, `allowedHeaders("*")`.
- Preflight desde `https://sitio-malicioso.example` → **200**, con `Access-Control-Allow-Origin: https://sitio-malicioso.example`.
- `GET` real con `Origin` ajeno → **200** y el origen reflejado en `Access-Control-Allow-Origin`.
- `Get-NetTCPConnection` muestra los puertos 8081/8082/8083 escuchando en `::` (todas las interfaces), no solo en `127.0.0.1`.
- No hay `spring-boot-starter-security` en ningún POM ni filtros de autenticación.

**Impacto**

Cualquier página web abierta por un usuario de la red puede leer, crear, modificar o borrar alumnos, sesiones y asistencias usando su navegador. En una red compartida (aula, oficina, Wi-Fi), cualquiera puede alterar notas de asistencia sin credenciales. El riesgo es bajo mientras todo corra en `localhost`; pasa a **crítico** en cuanto se expone el puerto.

**Recomendación**

1. Restringir CORS a los orígenes reales del panel (por ejemplo `http://localhost:8083`) y eliminar `*`.
2. Bindear a `127.0.0.1` en desarrollo (`server.address: 127.0.0.1`); si debe escuchar en red, exigir autenticación.
3. Añadir Spring Security con al menos autenticación por sesión/API key y autorización por rol (docente/admin).
4. Añadir cabeceras de seguridad: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS cuando haya HTTPS.
5. Documentar el modelo de amenazas y no publicar los puertos 8081/8082 fuera del host.

**Archivos:** `*/config/WebConfig.java`, `*/src/main/resources/application.yml`, `pom.xml`.

---

### ALTO-02 — Sin integridad referencial: asistencias huérfanas e IDs reutilizables

**Evidencia**

- `POST /api/asistencias` con `idAlumno=9999` e `idSesion=9999` → **201 Created**; el registro quedó creado.
- Se creó un alumno temporal, se le registró una asistencia y luego se borró el alumno: la asistencia **siguió existiendo** con `idAlumno` apuntando a un alumno inexistente.
- Las tablas usan `id integer primary key` (alias de `rowid` en SQLite), sin `AUTOINCREMENT`. SQLite puede **reutilizar** el ID de una fila borrada; una asistencia huérfana puede terminar apuntando a otro alumno nuevo con el mismo ID.
- `AsistenciaServiceImpl.crear` solo valida duplicados; no consulta la existencia de alumno ni de sesión.
- No existen claves foráneas porque cada servicio tiene su propia base.

**Impacto**

Historiales incorrectos o atribuidos a la persona equivocada, estadísticas corruptas y datos que no se pueden reparar sin intervención manual. Es el hallazgo con mayor probabilidad de producir un error visible en la demo (basta borrar un alumno y volver a crearlo).

**Recomendación**

1. Validar en `asistencia-service` que `idAlumno` e `idSesion` existan antes de guardar, usando `RestClient`/`WebClient` contra 8081 y 8082, con timeout y manejo de fallo.
2. Definir política de borrado: eliminar en cascada las asistencias del alumno/sesión (vía API interna) o impedir el borrado si tiene registros (409 con mensaje claro).
3. Cambiar la estrategia de IDs: `AUTOINCREMENT` en SQLite o identificadores opacos (UUID/ULID) para que un ID nunca se reasigne.
4. Añadir una prueba de integración que borre un alumno con asistencias y verifique la política elegida.
5. Considerar una tabla de “referencias” o un proceso de reconciliación periódica si se mantienen bases separadas.

**Archivos:** `asistencia-service/.../service/impl/AsistenciaServiceImpl.java`, `asistencia-service/.../schema.sql`, `alumno-service/.../service/impl/AlumnoServiceImpl.java`.

---

### ALTO-03 — La fecha de la asistencia no se valida contra la sesión y permite duplicados

**Evidencia**

- En el formulario de nueva asistencia, la fecha se inicializa con `todayIso()` y **no se actualiza al cambiar la sesión** (`app.js`, campo `f-fechaAsistencia`). Reproducido en navegador: sesión “Programación Java · 02 nov 2026” seleccionada, fecha resultante **2026-11-03**.
- El backend acepta cualquier fecha: se registraron asistencias con fechas `2030-01-01` y `2032-01-01`.
- La unicidad es `(id_alumno, id_sesion, fecha)`. Se aceptó **201** para el mismo alumno y la misma sesión con `2032-01-01` y `2032-01-02`; solo el tercer intento con la misma terna devolvió **409**.
- `AsistenciaRequestDTO` no tiene ninguna regla que relacione `fecha` con la sesión.

**Impacto**

Un mismo alumno puede aparecer varias veces en la misma clase con fechas distintas; el historial y los porcentajes de asistencia quedan inflados o descuadrados. En el uso normal, el operador puede registrar la asistencia con la fecha de hoy aunque la clase sea de otro día, sin que nada lo advierta.

**Recomendación**

1. En el frontend, al cambiar `#f-idSesion`, setear `fecha` con la fecha de la sesión seleccionada y bloquearla o advertir si se modifica.
2. En el backend, obtener la sesión y exigir `request.fecha().equals(sesion.fecha())`; si no coincide, responder **400** con detalle.
3. Si la regla de negocio es “una asistencia por alumno y sesión”, cambiar el índice único a `(id_alumno, id_sesion)` y ajustar el mensaje de duplicado. Si se permiten varias fechas, documentarlo explícitamente.
4. Rechazar fechas futuras absurdas o fuera del calendario académico.
5. Añadir pruebas de fecha coincidente, no coincidente y duplicado.

**Archivos:** `frontend/js/app.js` (formulario de asistencia), `asistencia-service/.../service/impl/AsistenciaServiceImpl.java`, `asistencia-service/.../dto/AsistenciaRequestDTO.java`, `asistencia-service/.../schema.sql`.

---

### ALTO-04 — Errores HTTP incorrectos: 404, 405 y 415 se devuelven como 500

**Evidencia**

| Petición | Esperado | Obtenido |
|---|---|---|
| `GET /no-existe` (8083) | 404 | **500** |
| `GET /actuator/health` (8083) | 404 (o health real) | **500** |
| `PATCH /api/alumnos` | 405 | **500** |
| `POST /api/alumnos` con `text/plain` | 415 | **500** |
| `POST /api/alumnos` con JSON malformado | 400 | 400 ✅ |
| `GET /api/alumnos/0` | 400 | 400 ✅ |
| `GET /robots.txt` (8083) | 200/404 | **500** |

- El `GlobalExceptionHandler` termina con `@ExceptionHandler(Exception.class)` que devuelve siempre 500; no hay handlers para `NoResourceFoundException`, `HttpRequestMethodNotSupportedException` ni `HttpMediaTypeNotSupportedException`.
- El log de `asistencia-service` confirma `NoResourceFoundException` para rutas inexistentes.

**Impacto**

Los clientes no pueden distinguir “no existe” de “fallo del servidor”; los monitores generan falsas alarmas; Lighthouse marca `robots.txt` inválido por el 500 (SEO 0.8). También complica el diagnóstico y las pruebas.

**Recomendación**

Añadir handlers explícitos, en los tres servicios:

```java
@ExceptionHandler(NoResourceFoundException.class)      // 404
@ExceptionHandler(NoHandlerFoundException.class)       // 404
@ExceptionHandler(HttpRequestMethodNotSupportedException.class) // 405
@ExceptionHandler(HttpMediaTypeNotSupportedException.class)     // 415
@ExceptionHandler(MissingServletRequestParameterException.class) // 400
@ExceptionHandler(MethodArgumentTypeMismatchException.class)     // ya existe
```

Mantener el `catch (Exception)` solo como última red, con log y correlación de errores. Añadir `/robots.txt` (o un `ResourceHandler` que devuelva 404 correcto).

**Archivos:** `*/exception/GlobalExceptionHandler.java`.

---

### ALTO-05 — Cero pruebas automatizadas

**Evidencia**

- No existe ningún directorio `src/test` en los tres servicios.
- `mvn test` en `alumno-service`: `[INFO] No tests to run.` y `BUILD SUCCESS`.
- Los POM incluyen `spring-boot-starter-test`, pero no se usa.

**Impacto**

Cada cambio en validaciones, fechas, duplicados o mapeo de errores puede romper el sistema sin que nadie lo detecte hasta la demo. Es la causa raíz de que varios de los hallazgos anteriores hayan pasado desapercibidos.

**Recomendación**

1. `@WebMvcTest` por controlador: 201 con `Location`, 400 de validación, 404, 405, 415, 409.
2. `@DataJpaTest` con SQLite temporal: unicidad, búsquedas y orden.
3. Pruebas de servicio con Mockito para duplicados y reglas de fecha.
4. Una prueba de integración por servicio con `@SpringBootTest` y base en `target/` (no la base real).
5. Añadir cobertura mínima (por ejemplo 70% en servicio/controlador) y ejecutarla en CI.

**Archivos:** nuevos `src/test/java/...`.

---

### MEDIO-01 — Unicidad del código de alumno sensible a mayúsculas

**Evidencia**

- Con `A001` ya existente, `POST /api/alumnos` con `codigo: "a001"` → **201 Created**.
- `GET /api/alumnos/codigo/A001` → 200; `GET /api/alumnos/codigo/a001` → **404**.
- En sesiones, `GET /api/sesiones/curso/CS101` y `/cs101` → **200** (comportamiento correcto e inconsistente con alumnos).
- `AlumnoServiceImpl.normalizar` solo hace `trim()`; el índice `uk_alumno_codigo` es case-sensitive.

**Impacto**

Dos identidades para el mismo alumno, historiales divididos y búsquedas que fallan según cómo se escriba el código.

**Recomendación**

Canonicalizar el código a mayúsculas al crear/actualizar, crear índice único `ON alumnos (codigo COLLATE NOCASE)` (o migrar los datos y mantener mayúsculas), y usar `findByCodigoIgnoreCase`. Añadir prueba `A001` vs `a001`.

**Archivos:** `alumno-service/.../service/impl/AlumnoServiceImpl.java`, `alumno-service/.../repository/AlumnoRepository.java`, `alumno-service/.../schema.sql`.

---

### MEDIO-02 — `sesion-service` no tiene restricción única en base de datos

**Evidencia**

- `sesion-service/src/main/resources/schema.sql` está **vacío**.
- `application.yml` de sesiones **no** configura `spring.sql.init`, a diferencia de alumnos y asistencias.
- La inspección SQLite muestra solo la tabla `sesiones`, sin índices únicos.
- `SesionServiceImpl` valida duplicados con `existsBy...` antes de guardar (ventana TOCTOU bajo concurrencia).

**Impacto**

Dos peticiones simultáneas pueden crear sesiones duplicadas; el servicio queda protegido solo por la comprobación en memoria, no por la base.

**Recomendación**

Crear `schema.sql` con índice único sobre `(codigo_curso COLLATE NOCASE, fecha, hora_inicio)`, habilitar `spring.sql.init.mode: always` y `defer-datasource-initialization: true`, y probar dos altas concurrentes.

**Archivos:** `sesion-service/src/main/resources/schema.sql`, `application.yml`.

---

### MEDIO-03 — Filtros de rango parciales se ignoran silenciosamente

**Evidencia**

- `GET /api/sesiones?desde=2026-11-01` → **200** con las 5 sesiones (no filtra).
- `GET /api/sesiones?hasta=2026-11-02` → **200** con las 5 sesiones (no filtra).
- `SesionController.listar` solo aplica rango si **ambos** parámetros vienen informados; si viene uno solo, cae en `buscar(curso, fecha)` y devuelve todo.

**Impacto**

El consumidor cree que filtró y recibe datos de más; los KPIs o reportes pueden calcularse sobre un conjunto incorrecto.

**Recomendación**

Si `desde` o `hasta` vienen solos, aplicar el límite correspondiente (`>= desde` o `<= hasta`) o rechazar con 400 indicando que se requieren ambos. Documentarlo en el README y cubrirlo con tests.

**Archivos:** `sesion-service/.../controller/SesionController.java`, `.../service/impl/SesionServiceImpl.java`, `.../repository/SesionRepository.java`.

---

### MEDIO-04 — Configuración de desarrollo activa y sin perfiles

**Evidencia**

- Los tres `application.yml`: `ddl-auto: update`, `show-sql: true`, `format_sql: true`, `include-message: always`.
- Hikari con `maximum-pool-size: 1` y `minimum-idle: 1` en los tres servicios.
- No hay `application-prod.yml`, perfiles ni variables de entorno.
- No hay actuator/health en ningún POM.
- No hay HTTPS ni cabeceras de seguridad.
- `asistencia-service` sirve el panel con `static-locations: file:../frontend/` **antes** de `classpath:/static/`.
- Las rutas SQLite son relativas (`./alumno_db.db`): si se arranca desde otra carpeta, se crean bases nuevas y vacías.

**Impacto**

En producción se generan logs con SQL y datos, se puede modificar el esquema por accidente, no hay health check para orquestadores, y el panel depende del directorio de trabajo. El pool de 1 conexión serializa todas las peticiones y puede producir timeouts bajo carga.

**Recomendación**

1. Perfiles `dev` y `prod`: en `prod`, `ddl-auto: validate`, `show-sql: false`, `include-message: never`.
2. Externalizar URL de base y secretos por variables de entorno.
3. Subir el pool a un valor razonable (por ejemplo 5–10) y medir.
4. Añadir `spring-boot-starter-actuator` con `health` e `info` expuestos solo a red interna.
5. Empaquetar el frontend en el JAR durante el build y quitar `file:../frontend/` en producción.
6. Añadir HTTPS y cabeceras (ver ALTO-01).

**Archivos:** `*/src/main/resources/application.yml`, `*/pom.xml`.

---

### MEDIO-05 — Sin paginación, filtrado en memoria e índices incompletos

**Evidencia**

- Los tres servicios usan `findAll()` para listar; no hay `Pageable` ni parámetros `page`/`size`.
- El panel descarga todos los alumnos, sesiones y asistencias y filtra/ordena en JavaScript.
- La tabla `asistencias` solo tiene el índice único `(id_alumno, id_sesion, fecha)`; no hay índice para `id_sesion` ni para `fecha`.
- `SesionRepository` busca por rango pero no hay índice explícito sobre `sesiones.fecha`.

**Impacto**

Con pocos cientos de registros funciona bien; con miles, el tiempo de carga y el consumo de memoria crecen linealmente y las consultas por sesión/fecha hacen escaneo completo.

**Recomendación**

Añadir paginación y filtros en servidor (`Pageable`, `Specification` o consultas derivadas), índices `asistencias(id_sesion)`, `asistencias(fecha)` y `sesiones(fecha)`, y adaptar el panel para cargar por páginas o por rango. Mantener los filtros actuales como mejora progresiva.

**Archivos:** `*/repository/*.java`, `*/controller/*.java`, `frontend/js/app.js`, `*/schema.sql`.

---

### MEDIO-06 — Inyección de fórmulas en la exportación CSV

**Evidencia**

`downloadCsv` en `app.js` escapa comillas y encierra cada valor entre `"`, pero no neutraliza valores que empiezan por `=`, `+`, `-`, `@`, tabulador o retorno de carro. Un nombre de alumno o curso como `=HYPERLINK("http://...")` se interpreta como fórmula al abrir el CSV en Excel/LibreOffice.

**Impacto**

Ejecución de fórmulas o enlaces maliciosos en el equipo de quien abre el archivo. Requiere que un atacante pueda introducir ese texto en un campo, pero el sistema no valida el contenido.

**Recomendación**

Antes de escapar, prefijar con apóstrofo (`'`) todo valor que empiece por `= + - @` o caracteres de control, y eliminar tabuladores/CR/LF. Aplicarlo a todas las exportaciones (alumnos, sesiones, asistencias, historial). Añadir prueba unitaria de la función.

**Archivos:** `frontend/js/app.js` (`downloadCsv`).

---

### MEDIO-07 — Condición de carrera al abrir el historial de dos alumnos

**Evidencia**

`openHistorial(idAlumno)` lanza `await http(...)`, pero no usa `AbortController` ni un token de petición. Si se abre el alumno A, se cierra el modal y se abre el alumno B antes de que responda A, la respuesta de A se escribe en `state.history.registros` y `renderHistorial()` la pinta usando `state.history.alumno` = B.

**Impacto**

El historial de B puede mostrar registros de A: datos incorrectos y, en un contexto real, exposición de información de otro alumno.

**Recomendación**

Guardar un `requestId` incremental o el `idAlumno` solicitado y descartar la respuesta si ya no coincide; opcionalmente usar `AbortController` y abortar al cerrar o abrir otro historial. Añadir prueba manual con red lenta (DevTools → throttling).

**Archivos:** `frontend/js/app.js` (`openHistorial`, `closeHistorial`, `renderHistorial`).

---

### BAJO-01 — Contraste insuficiente en tema oscuro (y `--muted` en claro)

**Evidencia Lighthouse** (dashboard, tema oscuro): accesibilidad **0.95**; 11 nodos con contraste insuficiente:

- `#6366f1` sobre `#1a2142` → **3.5:1** (`pill-soft`, `date-badge`).
- `#6366f1` sobre `#0f172a` → **3.99:1** (`link-btn`).
- Se espera **4.5:1** para texto normal.

**Mediciones propias:**

| Combinación | Ratio | Resultado |
|---|---:|---|
| `--muted #64748b` sobre `--bg #f4f6fb` | 4.40:1 | ❌ (texto normal) |
| `--muted #64748b` sobre `--surface #ffffff` | 4.76:1 | ✅ |
| Sidebar label `#6b7c99` sobre `#0b1222` | 4.42:1 | ❌ |
| `--muted #94a3b8` sobre dark surface `#0f172a` | 6.96:1 | ✅ |

**Impacto**

Texto difícil de leer para personas con baja visión; no bloquea el uso, pero incumple WCAG AA.

**Recomendación**

- En oscuro, usar un token de texto de marca más claro: `#a5b4fc` da **7.86:1** sobre `#1a2142` y **8.96:1** sobre `#0f172a`; conservar `#6366f1` solo para fondos de botones.
- En claro, cambiar `--muted` a `#5b6b80` (**5.03:1** sobre `#f4f6fb`) o similar.
- Sidebar: `#8296b5` sobre `#0b1222` da **6.21:1**.
- Re-ejecutar Lighthouse y verificar 1.0 en accesibilidad.

**Archivos:** `frontend/css/styles.css`.

---

### BAJO-02 — `robots.txt` devuelve 500 y afecta el SEO

**Evidencia**

Lighthouse: `robots.txt is not valid` con detalle “Request for robots.txt returned HTTP status: 500”. Es consecuencia directa de ALTO-04.

**Recomendación**

Servir un `robots.txt` estático (por ejemplo `User-agent: *\nDisallow: /api/`) o, si el panel no debe indexarse, añadir `X-Robots-Tag: noindex` y un `robots.txt` válido. Verificar 200/404 correcto.

**Archivos:** `frontend/` y `asistencia-service/src/main/resources/static/`.

---

### BAJO-03 — Duplicación del frontend y riesgo de deriva

**Evidencia**

El panel existe en `frontend/` y en `asistencia-service/src/main/resources/static/`. Los hashes SHA256 coinciden hoy, pero son dos copias mantenidas a mano. Además, `static-locations` prioriza `file:../frontend/`.

**Impacto**

Un cambio en una copia y no en la otra produce un panel distinto según cómo se ejecute el servicio.

**Recomendación**

Generar la copia empaquetada durante el build (`maven-resources-plugin`) y tratar `frontend/` como única fuente; eliminar `file:../frontend/` del perfil de producción. Añadir verificación de hashes o test de humo que compare.

**Archivos:** `frontend/`, `asistencia-service/src/main/resources/static/`, `pom.xml`.

---

### BAJO-04 — Sin CI, Docker, versionado de API ni health check

**Evidencia**

No hay `.github/workflows`, `Dockerfile`, `docker-compose.yml` ni prefijo `/api/v1`. No hay actuator.

**Impacto**

El build y las pruebas dependen de la máquina del autor; el despliegue no es reproducible y no hay sonda de salud.

**Recomendación**

Añadir CI (build + tests), `Dockerfile` por servicio o `docker-compose` con volúmenes para SQLite, versionar la API (`/api/v1/...`) y exponer `/actuator/health`.

---

## 5. Evidencia de pruebas HTTP

| # | Caso | Resultado observado | Veredicto |
|---|---|---|---|
| 1 | `GET /no-existe` | 500 | ❌ |
| 2 | `GET /actuator/health` | 500 | ❌ |
| 3 | `PATCH /api/alumnos` | 500 | ❌ (esperado 405) |
| 4 | `POST /api/alumnos` con `text/plain` | 500 | ❌ (esperado 415) |
| 5 | `POST /api/alumnos` JSON malformado | 400 | ✅ |
| 6 | `GET /api/alumnos/0` | 400 | ✅ |
| 7 | `GET /api/alumnos/999999` | 404 | ✅ |
| 8 | `GET /api/sesiones?fecha=mal` | 400 | ✅ |
| 9 | `GET /api/sesiones?desde=2026-11-05&hasta=2026-11-01` | 400 | ✅ |
| 10 | `GET /api/sesiones?desde=2026-11-01` (solo uno) | 200 con 5 sesiones | ❌ |
| 11 | `POST` alumno con código `A001` ya existente | 409 | ✅ |
| 12 | `POST` alumno con código `a001` existiendo `A001` | 201 | ❌ |
| 13 | `GET /api/alumnos/codigo/a001` | 404 | ❌ |
| 14 | `GET /api/sesiones/curso/cs101` y `CS101` | 200 / 200 | ✅ |
| 15 | `POST` asistencia con `idAlumno=9999`, `idSesion=9999` | 201 | ❌ |
| 16 | Borrar alumno con asistencia | asistencia huérfana persiste | ❌ |
| 17 | Mismo alumno+sesión, fechas `2032-01-01` y `2032-01-02` | 201 / 201 | ❌ |
| 18 | Misma terna alumno+sesión+fecha | 409 | ✅ |
| 19 | `OPTIONS` CORS desde origen ajeno | 200 + ACAO reflejado | ❌ |
| 20 | `GET` real con `Origin` ajeno | 200 + ACAO reflejado | ❌ |
| 21 | Estado de asistencia inválido | 400 | ✅ |
| 22 | `mvn test` en `alumno-service` | “No tests to run.” | ❌ |

---

## 6. Estado de las bases de datos

| Base | Tabla | Filas | Índices / restricciones |
|---|---|---:|---|
| `alumno_db.db` | `alumnos` | 6 | `uk_alumno_codigo` único sobre `codigo` (case-sensitive) |
| `sesion_db.db` | `sesiones` | 5 | Solo PK; **sin índice único** |
| `asistencia_db.db` | `asistencias` | 13 | `uk_asistencia_alumno_sesion_fecha` único; `CHECK` de estado |

- SQLite no aplica FK entre bases separadas; la integridad debe resolverse en la capa de servicio.
- `id integer primary key` permite reutilización de IDs tras un borrado.
- Faltan índices de apoyo para `id_sesion` y `fecha`.
- `.gitignore` excluye correctamente `*.db`, `*.db-journal`, `*.sqlite` y `*.log`.

---

## 7. Fortalezas verificadas

1. **Arquitectura limpia y consistente** en los tres servicios: controller → service (interfaz + impl) → repository → entity, con DTO de request/response.
2. **Bean Validation real** (`@NotBlank`, `@NotNull`, `@Positive`, `@Email`, `@Size`) y `@Validated` en controladores.
3. **Transacciones correctas** (`@Transactional` en escrituras, `readOnly` en lecturas) y `open-in-view: false`.
4. **Buen mapeo de errores de negocio**: 400 para validación, 404 para no encontrado, 409 para duplicado e integridad.
5. **Índices únicos** en alumnos y asistencias, con `CREATE UNIQUE INDEX IF NOT EXISTS` idempotente.
6. **Panel web completo y cuidado**: dashboard con KPIs, gráficos, filtros, búsqueda, CSV, tema claro/oscuro, responsive, estados de carga/vacío, toasts y confirmaciones.
7. **Historial por alumno** con estadísticas, distribución visual, filtros por periodo y exportación.
8. **Frontend escapa HTML** con `esc()` en los `innerHTML` revisados; no se detectó XSS directo.
9. **Accesibilidad por encima de lo habitual**: `lang`, `aria-label`, roles de diálogo, foco, navegación por teclado, contraste mayormente correcto.
10. **Documentación clara** y `.gitignore` adecuado.

---

## 8. Plan de remediación priorizado

### Fase 0 — Correcciones rápidas (4–6 horas)

1. Sincronizar la fecha con la sesión en el formulario y validarla en el backend (ALTO-03).
2. Añadir handlers 404/405/415 y `robots.txt` (ALTO-04, BAJO-02).
3. Añadir pruebas de humo de errores y de fecha (ALTO-05, parcial).
4. Prefijar fórmulas en CSV (MEDIO-06).

### Fase 1 — Integridad (1–2 días)

5. Validar existencia de alumno/sesión antes de guardar asistencia (ALTO-02).
6. Definir política de borrado y eliminar o bloquear huérfanos (ALTO-02).
7. Migrar a IDs no reutilizables o `AUTOINCREMENT` (ALTO-02).
8. Unicidad case-insensitive de código de alumno (MEDIO-01).
9. Índice único de sesiones y `spring.sql.init` (MEDIO-02).
10. Unicidad de asistencia por alumno+sesión o regla documentada (ALTO-03).

### Fase 2 — Seguridad y operación (2–3 días)

11. CORS restringido, bind a `127.0.0.1`, Spring Security y cabeceras (ALTO-01).
12. Perfiles `dev`/`prod`, `ddl-auto: validate`, sin SQL logging, pool ajustado (MEDIO-04).
13. Actuator/health, HTTPS y variables de entorno (MEDIO-04, BAJO-04).

### Fase 3 — Escalabilidad y calidad (2–3 días)

14. Paginación, filtros en servidor e índices (MEDIO-05).
15. Filtros de rango parciales (MEDIO-03).
16. Token/AbortController en el historial (MEDIO-07).
17. Contraste y re-auditoría Lighthouse (BAJO-01).
18. CI, Docker, build del frontend y versionado de API (BAJO-03, BAJO-04).

### Criterios de aceptación sugeridos

- [ ] `mvn test` ejecuta al menos una prueba por controlador y por regla de negocio.
- [ ] 404/405/415/400/409 devuelven el código correcto en los tres servicios.
- [ ] No se puede crear una asistencia con alumno o sesión inexistente.
- [ ] Borrar un alumno con asistencias sigue la política definida (cascada o bloqueo).
- [ ] La fecha de la asistencia siempre coincide con la sesión (o la regla está documentada).
- [ ] `A001` y `a001` no pueden coexistir.
- [ ] `GET /api/sesiones?desde=...` filtra o rechaza; no devuelve todo.
- [ ] CORS solo acepta el origen del panel; las APIs no son accesibles desde un origen ajeno.
- [ ] Lighthouse accesibilidad = 1.0 y `robots.txt` válido.
- [ ] Existe `application-prod.yml` con `ddl-auto: validate` y sin `show-sql`.

---

## 9. Conclusión

La entrega es **funcional, bien estructurada y visualmente sólida**, y cumple los requisitos académicos. Las brechas detectadas son las típicas de un prototipo que creció sin pruebas ni capa de seguridad: integridad entre microservicios, validación de reglas de negocio, mapeo de errores y configuración de producción.

Si solo hay tiempo para tres cambios antes de entregar, priorizaría:

1. **Fecha de asistencia = fecha de sesión** (visible y fácil de corregir).
2. **Handlers 404/405/415** (mejora inmediata de calidad de API).
3. **Validar existencia de alumno/sesión** (evita datos corruptos en la demo).

El resto puede abordarse de forma incremental con el plan de la sección 8.

---

### Anexo A — Endpoints verificados

| Servicio | Método | Ruta | Estado |
|---|---|---|---|
| Alumnos | GET | `/api/alumnos`, `/api/alumnos/{id}`, `/api/alumnos/codigo/{codigo}`, `/api/alumnos?buscar=` | ✅ |
| Alumnos | POST/PUT/DELETE | `/api/alumnos`, `/api/alumnos/{id}` | ✅ |
| Sesiones | GET | `/api/sesiones`, `/api/sesiones/{id}`, `/api/sesiones/curso/{codigo}`, `?curso=&fecha=&desde=&hasta=` | ⚠️ rango parcial |
| Sesiones | POST/PUT/DELETE | `/api/sesiones`, `/api/sesiones/{id}` | ✅ |
| Asistencias | GET | `/api/asistencias`, `/api/asistencias/{id}`, `/api/asistencias/alumno/{idAlumno}`, `/api/asistencias/sesion/{idSesion}` | ✅ |
| Asistencias | POST/PUT/DELETE | `/api/asistencias`, `/api/asistencias/{id}` | ⚠️ integridad |

### Anexo B — Versiones resueltas

- Spring Boot 3.5.16
- Spring WebMVC 6.2.19
- Tomcat embebido 10.1.55
- Hibernate ORM 6.6.53.Final
- `sqlite-jdbc` 3.54.1.0
- Compilación `release 17`
