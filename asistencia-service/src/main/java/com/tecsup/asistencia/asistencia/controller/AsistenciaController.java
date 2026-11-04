package com.tecsup.asistencia.asistencia.controller;

import com.tecsup.asistencia.asistencia.dto.AsistenciaRequestDTO;
import com.tecsup.asistencia.asistencia.dto.AsistenciaResponseDTO;
import com.tecsup.asistencia.asistencia.service.AsistenciaService;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * API REST para el CRUD de asistencias.
 */
@RestController
@RequestMapping("/api/asistencias")
@Validated
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    public AsistenciaController(AsistenciaService asistenciaService) {
        this.asistenciaService = asistenciaService;
    }

    @GetMapping
    public ResponseEntity<List<AsistenciaResponseDTO>> listar() {
        return ResponseEntity.ok(asistenciaService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AsistenciaResponseDTO> obtenerPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(asistenciaService.obtenerPorId(id));
    }

    @GetMapping("/alumno/{idAlumno}")
    public ResponseEntity<List<AsistenciaResponseDTO>> listarPorAlumno(
            @PathVariable @Positive Long idAlumno) {
        return ResponseEntity.ok(asistenciaService.listarPorAlumno(idAlumno));
    }

    @GetMapping("/sesion/{idSesion}")
    public ResponseEntity<List<AsistenciaResponseDTO>> listarPorSesion(
            @PathVariable @Positive Long idSesion) {
        return ResponseEntity.ok(asistenciaService.listarPorSesion(idSesion));
    }

    @PostMapping
    public ResponseEntity<AsistenciaResponseDTO> crear(@Valid @RequestBody AsistenciaRequestDTO request) {
        AsistenciaResponseDTO creada = asistenciaService.crear(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creada.id())
                .toUri();
        return ResponseEntity.created(location).body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AsistenciaResponseDTO> actualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody AsistenciaRequestDTO request) {
        return ResponseEntity.ok(asistenciaService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable @Positive Long id) {
        asistenciaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
