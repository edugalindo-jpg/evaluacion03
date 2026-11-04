package com.tecsup.asistencia.sesion.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos de salida de una sesion.
 */
public record SesionResponseDTO(
        Long id,
        String codigoCurso,
        String nombreCurso,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin
) {
}
