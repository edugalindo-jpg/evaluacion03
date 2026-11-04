package com.tecsup.asistencia.sesion.controller;

import com.tecsup.asistencia.sesion.dto.SesionRequestDTO;
import com.tecsup.asistencia.sesion.dto.SesionResponseDTO;
import com.tecsup.asistencia.sesion.service.SesionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
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
import java.time.LocalDate;
import java.util.List;

/**
 * API REST para el CRUD de sesiones de clase.
 */
@RestController
@RequestMapping("/api/sesiones")
@Validated
public class SesionController {

    private final SesionService sesionService;

    public SesionController(SesionService sesionService) {
        this.sesionService = sesionService;
    }

    @GetMapping
    public ResponseEntity<List<SesionResponseDTO>> listar(
            @RequestParam(name = "curso", required = false) String curso,
            @RequestParam(name = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(name = "desde", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(name = "hasta", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {

        if (desde != null && hasta != null) {
            return ResponseEntity.ok(sesionService.listarPorRango(desde, hasta));
        }
        return ResponseEntity.ok(sesionService.buscar(curso, fecha));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SesionResponseDTO> obtenerPorId(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(sesionService.obtenerPorId(id));
    }

    @GetMapping("/curso/{codigoCurso}")
    public ResponseEntity<List<SesionResponseDTO>> listarPorCurso(@PathVariable String codigoCurso) {
        return ResponseEntity.ok(sesionService.listarPorCurso(codigoCurso));
    }

    @PostMapping
    public ResponseEntity<SesionResponseDTO> crear(@Valid @RequestBody SesionRequestDTO request) {
        SesionResponseDTO creada = sesionService.crear(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(creada.id())
                .toUri();
        return ResponseEntity.created(location).body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SesionResponseDTO> actualizar(
            @PathVariable @Positive Long id,
            @Valid @RequestBody SesionRequestDTO request) {
        return ResponseEntity.ok(sesionService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable @Positive Long id) {
        sesionService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
