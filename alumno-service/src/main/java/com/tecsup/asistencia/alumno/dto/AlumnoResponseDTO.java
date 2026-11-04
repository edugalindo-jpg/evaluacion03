package com.tecsup.asistencia.alumno.dto;

/**
 * Datos de salida de un alumno.
 */
public record AlumnoResponseDTO(
        Long id,
        String codigo,
        String nombres,
        String apellidos,
        String correo,
        Boolean estado
) {
}
