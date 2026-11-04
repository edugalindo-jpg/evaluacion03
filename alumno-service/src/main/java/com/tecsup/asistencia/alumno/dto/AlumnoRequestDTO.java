package com.tecsup.asistencia.alumno.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Datos de entrada para crear o actualizar un alumno.
 */
public record AlumnoRequestDTO(

        @NotBlank(message = "El codigo es obligatorio")
        @Size(max = 20, message = "El codigo no debe superar los 20 caracteres")
        String codigo,

        @NotBlank(message = "Los nombres son obligatorios")
        @Size(max = 100, message = "Los nombres no deben superar los 100 caracteres")
        String nombres,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(max = 100, message = "Los apellidos no deben superar los 100 caracteres")
        String apellidos,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato valido")
        @Size(max = 150, message = "El correo no debe superar los 150 caracteres")
        String correo,

        Boolean estado
) {
}
