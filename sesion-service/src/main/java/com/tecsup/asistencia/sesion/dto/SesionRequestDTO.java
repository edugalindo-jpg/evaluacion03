package com.tecsup.asistencia.sesion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos de entrada para crear o actualizar una sesion.
 */
public record SesionRequestDTO(

        @NotBlank(message = "El codigo del curso es obligatorio")
        @Size(max = 20, message = "El codigo del curso no debe superar los 20 caracteres")
        String codigoCurso,

        @NotBlank(message = "El nombre del curso es obligatorio")
        @Size(max = 150, message = "El nombre del curso no debe superar los 150 caracteres")
        String nombreCurso,

        @NotNull(message = "La fecha es obligatoria")
        LocalDate fecha,

        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,

        @NotNull(message = "La hora de fin es obligatoria")
        LocalTime horaFin
) {
}
