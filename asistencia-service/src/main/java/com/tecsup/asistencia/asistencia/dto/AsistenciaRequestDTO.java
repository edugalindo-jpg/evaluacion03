package com.tecsup.asistencia.asistencia.dto;

import com.tecsup.asistencia.asistencia.entity.EstadoAsistencia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

/**
 * Datos de entrada para crear o actualizar una asistencia.
 */
public record AsistenciaRequestDTO(

        @NotNull(message = "El id del alumno es obligatorio")
        @Positive(message = "El id del alumno debe ser mayor que cero")
        Long idAlumno,

        @NotNull(message = "El id de la sesion es obligatorio")
        @Positive(message = "El id de la sesion debe ser mayor que cero")
        Long idSesion,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @NotNull(message = "El estado es obligatorio (PRESENTE, TARDANZA o FALTA)")
        EstadoAsistencia estado
) {
}
