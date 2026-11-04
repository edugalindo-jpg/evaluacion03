package com.tecsup.asistencia.asistencia.exception;

/**
 * Se lanza cuando se intenta registrar un recurso que ya existe.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
