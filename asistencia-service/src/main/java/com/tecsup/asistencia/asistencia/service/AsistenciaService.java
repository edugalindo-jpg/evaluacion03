package com.tecsup.asistencia.asistencia.service;

import com.tecsup.asistencia.asistencia.dto.AsistenciaRequestDTO;
import com.tecsup.asistencia.asistencia.dto.AsistenciaResponseDTO;

import java.util.List;

/**
 * Contrato de negocio para la gestion de asistencias.
 */
public interface AsistenciaService {

    List<AsistenciaResponseDTO> listar();

    List<AsistenciaResponseDTO> listarPorAlumno(Long idAlumno);

    List<AsistenciaResponseDTO> listarPorSesion(Long idSesion);

    AsistenciaResponseDTO obtenerPorId(Long id);

    AsistenciaResponseDTO crear(AsistenciaRequestDTO request);

    AsistenciaResponseDTO actualizar(Long id, AsistenciaRequestDTO request);

    void eliminar(Long id);
}
