package com.tecsup.asistencia.alumno.controller;

import com.tecsup.asistencia.alumno.dto.AlumnoRequestDTO;
import com.tecsup.asistencia.alumno.dto.AlumnoResponseDTO;
import com.tecsup.asistencia.alumno.service.AlumnoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * API REST para el CRUD de alumnos.
 */
@RestController
@RequestMapping("/api/alumnos")
@Validated
public class AlumnoController {

    private final AlumnoService alumnoService;

    public AlumnoController(AlumnoService alumnoService) {
        this.alumnoService = alumnoService;
    }

    @GetMapping
    public ResponseEntity<List<AlumnoResponseDTO>> listar(
            @RequestParam(name = "buscar", required = false) String buscar) {
        List<AlumnoResponseDTO> alumnos = (buscar == null || buscar.isBlank())
                ? alumnoService.listar()
                : alumnoService.buscar(buscar);
        return ResponseEntity.ok(alumnos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlumnoResponseDTO> obtenerPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(alumnoService.obtenerPorId(id));
    }

    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<AlumnoResponseDTO> obtenerPorCodigo(@PathVariable String codigo) {
        return ResponseEntity.ok(alumnoService.obtenerPorCodigo(codigo));
    }

    @PostMapping
    public ResponseEntity<AlumnoResponseDTO> crear(@Valid @RequestBody AlumnoRequestDTO request) {
        AlumnoResponseDTO creado = alumnoService.crear(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creado.id())
                .toUri();
        return ResponseEntity.created(location).body(creado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AlumnoResponseDTO> actualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody AlumnoRequestDTO request) {
        return ResponseEntity.ok(alumnoService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable @Positive Long id) {
        alumnoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
