package com.tecsup.asistencia.sesion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada del microservicio de sesiones de clase.
 * Expone el CRUD REST de sesiones sobre MySQL en el puerto 8082.
 */
@SpringBootApplication
public class SesionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SesionServiceApplication.class, args);
    }
}
