package com.tecsup.asistencia.asistencia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada del microservicio de asistencias.
 * Expone el CRUD REST de asistencias sobre MySQL en el puerto 8083.
 */
@SpringBootApplication
public class AsistenciaServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsistenciaServiceApplication.class, args);
    }
}
