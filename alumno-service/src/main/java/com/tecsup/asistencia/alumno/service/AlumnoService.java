package com.tecsup.asistencia.alumno.service;

import com.tecsup.asistencia.alumno.dto.AlumnoRequestDTO;
import com.tecsup.asistencia.alumno.dto.AlumnoResponseDTO;

import java.util.List;

/**
 * Contrato de negocio para la gestion de alumnos.
 */
public interface AlumnoService {

    List<AlumnoResponseDTO> listar();

    List<AlumnoResponseDTO> buscar(String termino);

    AlumnoResponseDTO obtenerPorId(Long id);

    AlumnoResponseDTO obtenerPorCodigo(String codigo);

    AlumnoResponseDTO crear(AlumnoRequestDTO request);

    AlumnoResponseDTO actualizar(Long id, AlumnoRequestDTO request);

    void eliminar(Long id);
}
