package com.tecsup.asistencia.asistencia.exception;

/**
 * Se lanza cuando un recurso solicitado no existe.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, String field, Object value) {
        super(String.format("%s no encontrado con %s = '%s'", resource, field, value));
    }
}
