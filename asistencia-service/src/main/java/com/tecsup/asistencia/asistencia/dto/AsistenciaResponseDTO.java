package com.tecsup.asistencia.asistencia.dto;

import com.tecsup.asistencia.asistencia.entity.EstadoAsistencia;

import java.time.LocalDate;

/**
 * Datos de salida de una asistencia.
 */
public record AsistenciaResponseDTO(
        Long id,
        Long idAlumno,
        Long idSesion,
        LocalDate fecha,
        EstadoAsistencia estado
) {
}
