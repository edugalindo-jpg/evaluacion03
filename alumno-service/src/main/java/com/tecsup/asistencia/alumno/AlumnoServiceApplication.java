package com.tecsup.asistencia.alumno;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada del microservicio de alumnos.
 * Expone el CRUD REST de alumnos sobre MySQL en el puerto 8081.
 */
@SpringBootApplication
public class AlumnoServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AlumnoServiceApplication.class, args);
    }
}
