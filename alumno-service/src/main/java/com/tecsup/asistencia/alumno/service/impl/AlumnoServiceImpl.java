package com.tecsup.asistencia.alumno.service.impl;

import com.tecsup.asistencia.alumno.dto.AlumnoRequestDTO;
import com.tecsup.asistencia.alumno.dto.AlumnoResponseDTO;
import com.tecsup.asistencia.alumno.entity.Alumno;
import com.tecsup.asistencia.alumno.exception.DuplicateResourceException;
import com.tecsup.asistencia.alumno.exception.ResourceNotFoundException;
import com.tecsup.asistencia.alumno.repository.AlumnoRepository;
import com.tecsup.asistencia.alumno.service.AlumnoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Implementacion de las reglas de negocio de alumnos.
 */
@Service
@Transactional(readOnly = true)
public class AlumnoServiceImpl implements AlumnoService {

    private final AlumnoRepository alumnoRepository;

    public AlumnoServiceImpl(AlumnoRepository alumnoRepository) {
        this.alumnoRepository = alumnoRepository;
    }

    @Override
    public List<AlumnoResponseDTO> listar() {
        return alumnoRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<AlumnoResponseDTO> buscar(String termino) {
        String filtro = termino == null ? "" : termino.trim();
        return alumnoRepository
                .findByNombresContainingIgnoreCaseOrApellidosContainingIgnoreCaseOrCodigoContainingIgnoreCase(
                        filtro, filtro, filtro)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public AlumnoResponseDTO obtenerPorId(Long id) {
        return toResponse(buscarEntidad(id));
    }

    @Override
    public AlumnoResponseDTO obtenerPorCodigo(String codigo) {
        Alumno alumno = alumnoRepository.findByCodigo(codigo)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno", "codigo", codigo));
        return toResponse(alumno);
    }

    @Override
    @Transactional
    public AlumnoResponseDTO crear(AlumnoRequestDTO request) {
        String codigo = normalizar(request.codigo());
        if (alumnoRepository.existsByCodigo(codigo)) {
            throw new DuplicateResourceException("Ya existe un alumno con el codigo '" + codigo + "'");
        }

        Alumno alumno = new Alumno();
        aplicarDatos(alumno, request, codigo);
        if (alumno.getEstado() == null) {
            alumno.setEstado(Boolean.TRUE);
        }

        return toResponse(alumnoRepository.save(alumno));
    }

    @Override
    @Transactional
    public AlumnoResponseDTO actualizar(Long id, AlumnoRequestDTO request) {
        Alumno alumno = buscarEntidad(id);
        String codigo = normalizar(request.codigo());

        if (alumnoRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new DuplicateResourceException("Ya existe un alumno con el codigo '" + codigo + "'");
        }

        aplicarDatos(alumno, request, codigo);
        return toResponse(alumnoRepository.save(alumno));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Alumno alumno = buscarEntidad(id);
        alumnoRepository.delete(alumno);
    }

    private Alumno buscarEntidad(Long id) {
        return alumnoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno", "id", id));
    }

    private void aplicarDatos(Alumno alumno, AlumnoRequestDTO request, String codigo) {
        alumno.setCodigo(codigo);
        alumno.setNombres(normalizar(request.nombres()));
        alumno.setApellidos(normalizar(request.apellidos()));
        alumno.setCorreo(normalizar(request.correo()).toLowerCase());
        if (request.estado() != null) {
            alumno.setEstado(request.estado());
        }
    }

    private String normalizar(String valor) {
        return valor == null ? null : valor.trim();
    }

    private AlumnoResponseDTO toResponse(Alumno alumno) {
        return new AlumnoResponseDTO(
                alumno.getId(),
                alumno.getCodigo(),
                alumno.getNombres(),
                alumno.getApellidos(),
                alumno.getCorreo(),
                alumno.getEstado()
        );
    }
}
