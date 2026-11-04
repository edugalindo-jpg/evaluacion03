-- Importar este archivo desde SQLyog. Crea las tres bases y carga los datos de demo.
CREATE DATABASE IF NOT EXISTS alumno_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sesion_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS asistencia_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE alumno_db;
CREATE TABLE IF NOT EXISTS alumnos (
  id BIGINT NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  estado BIT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_alumno_codigo UNIQUE (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO alumnos (id, codigo, nombres, apellidos, correo, estado) VALUES
(1, 'A001', 'Ana María', 'Pérez Gómez', 'ana.perez@tecsup.edu.pe', b'1'),
(2, 'A002', 'Luis Fernando', 'Quispe Rojas', 'luis.quispe@tecsup.edu.pe', b'1'),
(3, 'A003', 'María Fernanda', 'Torres Silva', 'maria.torres@tecsup.edu.pe', b'1'),
(4, 'A004', 'Carlos Andrés', 'Ramírez Díaz', 'carlos.ramirez@tecsup.edu.pe', b'1'),
(5, 'A005', 'Valeria Sofía', 'Mendoza Cruz', 'valeria.mendoza@tecsup.edu.pe', b'1'),
(6, 'A006', 'Jorge Luis', 'Vargas León', 'jorge.vargas@tecsup.edu.pe', b'0');

USE sesion_db;
CREATE TABLE IF NOT EXISTS sesiones (
  id BIGINT NOT NULL AUTO_INCREMENT,
  codigo_curso VARCHAR(20) NOT NULL,
  nombre_curso VARCHAR(150) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO sesiones (id, codigo_curso, nombre_curso, fecha, hora_inicio, hora_fin) VALUES
(1, 'CS101', 'Programación Java', '2026-11-02', '13:00:00', '15:00:00'),
(2, 'BD201', 'Base de Datos', '2026-11-03', '15:00:00', '17:00:00'),
(3, 'WD301', 'Desarrollo Web', '2026-11-03', '19:00:00', '21:00:00'),
(4, 'CS101', 'Programación Java', '2026-11-04', '13:00:00', '15:00:00'),
(5, 'BD201', 'Base de Datos', '2026-11-05', '15:00:00', '17:00:00');

USE asistencia_db;
CREATE TABLE IF NOT EXISTS asistencias (
  id BIGINT NOT NULL AUTO_INCREMENT,
  id_alumno BIGINT NOT NULL,
  id_sesion BIGINT NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_asistencia_estado CHECK (estado IN ('PRESENTE', 'TARDANZA', 'FALTA')),
  CONSTRAINT uk_asistencia_alumno_sesion_fecha UNIQUE (id_alumno, id_sesion, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO asistencias (id, id_alumno, id_sesion, fecha, estado) VALUES
(1, 1, 1, '2026-11-02', 'PRESENTE'),
(2, 2, 1, '2026-11-02', 'PRESENTE'),
(3, 3, 1, '2026-11-02', 'TARDANZA'),
(4, 4, 1, '2026-11-02', 'FALTA'),
(5, 1, 2, '2026-11-03', 'PRESENTE'),
(6, 2, 2, '2026-11-03', 'TARDANZA'),
(7, 5, 2, '2026-11-03', 'PRESENTE'),
(8, 3, 3, '2026-11-03', 'PRESENTE'),
(9, 4, 3, '2026-11-03', 'FALTA'),
(10, 5, 3, '2026-11-03', 'TARDANZA'),
(11, 1, 4, '2026-11-04', 'PRESENTE'),
(12, 2, 4, '2026-11-04', 'PRESENTE'),
(13, 3, 4, '2026-11-04', 'TARDANZA');
