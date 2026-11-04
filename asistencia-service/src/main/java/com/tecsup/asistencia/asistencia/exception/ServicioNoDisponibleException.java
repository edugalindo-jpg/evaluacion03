package com.tecsup.asistencia.asistencia.exception;

/**
 * Se lanza cuando no es posible contactar con un microservicio externo
 * (alumnos o sesiones) para validar una referencia.
 */
public class ServicioNoDisponibleException extends RuntimeException {

    public ServicioNoDisponibleException(String servicio, Throwable cause) {
        super("No se pudo contactar con " + servicio, cause);
    }
}
