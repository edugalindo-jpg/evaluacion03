package com.tecsup.asistencia.sesion.service.impl;

import com.tecsup.asistencia.sesion.dto.SesionRequestDTO;
import com.tecsup.asistencia.sesion.dto.SesionResponseDTO;
import com.tecsup.asistencia.sesion.entity.Sesion;
import com.tecsup.asistencia.sesion.exception.DuplicateResourceException;
import com.tecsup.asistencia.sesion.exception.ResourceNotFoundException;
import com.tecsup.asistencia.sesion.repository.SesionRepository;
import com.tecsup.asistencia.sesion.service.SesionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Implementacion de las reglas de negocio de sesiones.
 */
@Service
@Transactional(readOnly = true)
public class SesionServiceImpl implements SesionService {

    private final SesionRepository sesionRepository;

    public SesionServiceImpl(SesionRepository sesionRepository) {
        this.sesionRepository = sesionRepository;
    }

    @Override
    public List<SesionResponseDTO> listar() {
        return sesionRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<SesionResponseDTO> buscar(String codigoCurso, LocalDate fecha) {
        boolean tieneCurso = codigoCurso != null && !codigoCurso.isBlank();
        List<Sesion> sesiones;

        if (tieneCurso && fecha != null) {
            sesiones = sesionRepository.findByCodigoCursoIgnoreCaseAndFecha(codigoCurso.trim(), fecha);
        } else if (tieneCurso) {
            sesiones = sesionRepository.findByCodigoCursoIgnoreCase(codigoCurso.trim());
        } else if (fecha != null) {
            sesiones = sesionRepository.findByFecha(fecha);
        } else {
            sesiones = sesionRepository.findAll();
        }

        return sesiones.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<SesionResponseDTO> listarPorCurso(String codigoCurso) {
        return sesionRepository.findByCodigoCursoIgnoreCase(codigoCurso).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<SesionResponseDTO> listarPorRango(LocalDate desde, LocalDate hasta) {
        if (desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha 'desde' no puede ser posterior a la fecha 'hasta'");
        }
        return sesionRepository.findByFechaBetweenOrderByFechaAscHoraInicioAsc(desde, hasta).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public SesionResponseDTO obtenerPorId(Long id) {
        return toResponse(buscarEntidad(id));
    }

    @Override
    @Transactional
    public SesionResponseDTO crear(SesionRequestDTO request) {
        validarHorario(request);
        String codigoCurso = request.codigoCurso().trim();

        if (sesionRepository.existsByCodigoCursoIgnoreCaseAndFechaAndHoraInicio(
                codigoCurso, request.fecha(), request.horaInicio())) {
            throw new DuplicateResourceException(
                    "Ya existe una sesion para el curso '" + codigoCurso + "' en esa fecha y hora de inicio");
        }

        Sesion sesion = new Sesion();
        aplicarDatos(sesion, request, codigoCurso);
        return toResponse(sesionRepository.save(sesion));
    }

    @Override
    @Transactional
    public SesionResponseDTO actualizar(Long id, SesionRequestDTO request) {
        validarHorario(request);
        Sesion sesion = buscarEntidad(id);
        String codigoCurso = request.codigoCurso().trim();

        if (sesionRepository.existsByCodigoCursoIgnoreCaseAndFechaAndHoraInicioAndIdNot(
                codigoCurso, request.fecha(), request.horaInicio(), id)) {
            throw new DuplicateResourceException(
                    "Ya existe una sesion para el curso '" + codigoCurso + "' en esa fecha y hora de inicio");
        }

        aplicarDatos(sesion, request, codigoCurso);
        return toResponse(sesionRepository.save(sesion));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Sesion sesion = buscarEntidad(id);
        sesionRepository.delete(sesion);
    }

    private Sesion buscarEntidad(Long id) {
        return sesionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sesion", "id", id));
    }

    private void validarHorario(SesionRequestDTO request) {
        if (!request.horaFin().isAfter(request.horaInicio())) {
            throw new IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio");
        }
    }

    private void aplicarDatos(Sesion sesion, SesionRequestDTO request, String codigoCurso) {
        sesion.setCodigoCurso(codigoCurso);
        sesion.setNombreCurso(request.nombreCurso().trim());
        sesion.setFecha(request.fecha());
        sesion.setHoraInicio(request.horaInicio());
        sesion.setHoraFin(request.horaFin());
    }

    private SesionResponseDTO toResponse(Sesion sesion) {
        return new SesionResponseDTO(
                sesion.getId(),
                sesion.getCodigoCurso(),
                sesion.getNombreCurso(),
                sesion.getFecha(),
                sesion.getHoraInicio(),
                sesion.getHoraFin()
        );
    }
}
