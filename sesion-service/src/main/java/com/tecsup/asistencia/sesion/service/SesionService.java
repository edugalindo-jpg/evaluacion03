package com.tecsup.asistencia.sesion.service;

import com.tecsup.asistencia.sesion.dto.SesionRequestDTO;
import com.tecsup.asistencia.sesion.dto.SesionResponseDTO;

import java.time.LocalDate;
import java.util.List;

/**
 * Contrato de negocio para la gestion de sesiones de clase.
 */
public interface SesionService {

    List<SesionResponseDTO> listar();

    List<SesionResponseDTO> buscar(String codigoCurso, LocalDate fecha);

    List<SesionResponseDTO> listarPorCurso(String codigoCurso);

    List<SesionResponseDTO> listarPorRango(LocalDate desde, LocalDate hasta);

    SesionResponseDTO obtenerPorId(Long id);

    SesionResponseDTO crear(SesionRequestDTO request);

    SesionResponseDTO actualizar(Long id, SesionRequestDTO request);

    void eliminar(Long id);
}
