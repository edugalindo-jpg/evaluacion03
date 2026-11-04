package com.tecsup.asistencia.asistencia.service.impl;

import com.tecsup.asistencia.asistencia.client.CatalogoClient;
import com.tecsup.asistencia.asistencia.dto.AsistenciaRequestDTO;
import com.tecsup.asistencia.asistencia.dto.AsistenciaResponseDTO;
import com.tecsup.asistencia.asistencia.entity.Asistencia;
import com.tecsup.asistencia.asistencia.exception.DuplicateResourceException;
import com.tecsup.asistencia.asistencia.exception.ResourceNotFoundException;
import com.tecsup.asistencia.asistencia.repository.AsistenciaRepository;
import com.tecsup.asistencia.asistencia.service.AsistenciaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Implementacion de las reglas de negocio de asistencias.
 * La unicidad se controla por alumno, sesion y fecha.
 */
@Service
@Transactional(readOnly = true)
public class AsistenciaServiceImpl implements AsistenciaService {

    private final AsistenciaRepository asistenciaRepository;
    private final CatalogoClient catalogoClient;

    public AsistenciaServiceImpl(AsistenciaRepository asistenciaRepository, CatalogoClient catalogoClient) {
        this.asistenciaRepository = asistenciaRepository;
        this.catalogoClient = catalogoClient;
    }

    @Override
    public List<AsistenciaResponseDTO> listar() {
        return asistenciaRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<AsistenciaResponseDTO> listarPorAlumno(Long idAlumno) {
        return asistenciaRepository.buscarPorAlumno(idAlumno).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<AsistenciaResponseDTO> listarPorSesion(Long idSesion) {
        return asistenciaRepository.buscarPorSesion(idSesion).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public AsistenciaResponseDTO obtenerPorId(Long id) {
        return toResponse(buscarEntidad(id));
    }

    @Override
    @Transactional
    public AsistenciaResponseDTO crear(AsistenciaRequestDTO request) {
        validarReferencias(request);

        if (asistenciaRepository.existsByIdAlumnoAndIdSesionAndFecha(
                request.idAlumno(), request.idSesion(), request.fecha())) {
            throw new DuplicateResourceException(
                    "Ya existe un registro de asistencia para el alumno " + request.idAlumno()
                            + " en la sesion " + request.idSesion() + " para la fecha " + request.fecha());
        }

        Asistencia asistencia = new Asistencia();
        aplicarDatos(asistencia, request);
        return toResponse(asistenciaRepository.save(asistencia));
    }

    @Override
    @Transactional
    public AsistenciaResponseDTO actualizar(Long id, AsistenciaRequestDTO request) {
        Asistencia asistencia = buscarEntidad(id);
        validarReferencias(request);

        if (asistenciaRepository.existsByIdAlumnoAndIdSesionAndFechaAndIdNot(
                request.idAlumno(), request.idSesion(), request.fecha(), id)) {
            throw new DuplicateResourceException(
                    "Ya existe un registro de asistencia para el alumno " + request.idAlumno()
                            + " en la sesion " + request.idSesion() + " para la fecha " + request.fecha());
        }

        aplicarDatos(asistencia, request);
        return toResponse(asistenciaRepository.save(asistencia));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Asistencia asistencia = buscarEntidad(id);
        asistenciaRepository.delete(asistencia);
    }

    private Asistencia buscarEntidad(Long id) {
        return asistenciaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia", "id", id));
    }

    private void validarReferencias(AsistenciaRequestDTO request) {
        catalogoClient.buscarAlumno(request.idAlumno())
                .orElseThrow(() -> new ResourceNotFoundException("Alumno", "id", request.idAlumno()));

        CatalogoClient.SesionRef sesion = catalogoClient.buscarSesion(request.idSesion())
                .orElseThrow(() -> new ResourceNotFoundException("Sesion", "id", request.idSesion()));

        if (sesion.fecha() == null || !sesion.fecha().equals(request.fecha())) {
            throw new IllegalArgumentException(
                    "La fecha de la asistencia (" + request.fecha()
                            + ") debe coincidir con la fecha de la sesion (" + sesion.fecha() + ")");
        }
    }

    private void aplicarDatos(Asistencia asistencia, AsistenciaRequestDTO request) {
        asistencia.setIdAlumno(request.idAlumno());
        asistencia.setIdSesion(request.idSesion());
        asistencia.setFecha(request.fecha());
        asistencia.setEstado(request.estado());
    }

    private AsistenciaResponseDTO toResponse(Asistencia asistencia) {
        return new AsistenciaResponseDTO(
                asistencia.getId(),
                asistencia.getIdAlumno(),
                asistencia.getIdSesion(),
                asistencia.getFecha(),
                asistencia.getEstado()
        );
    }
}
