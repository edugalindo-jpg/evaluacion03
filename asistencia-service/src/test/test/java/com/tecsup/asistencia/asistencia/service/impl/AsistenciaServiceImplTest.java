package com.tecsup.asistencia.asistencia.service.impl;

import com.tecsup.asistencia.asistencia.client.CatalogoClient;
import com.tecsup.asistencia.asistencia.dto.AsistenciaRequestDTO;
import com.tecsup.asistencia.asistencia.dto.AsistenciaResponseDTO;
import com.tecsup.asistencia.asistencia.entity.Asistencia;
import com.tecsup.asistencia.asistencia.entity.EstadoAsistencia;
import com.tecsup.asistencia.asistencia.exception.DuplicateResourceException;
import com.tecsup.asistencia.asistencia.exception.ResourceNotFoundException;
import com.tecsup.asistencia.asistencia.exception.ServicioNoDisponibleException;
import com.tecsup.asistencia.asistencia.repository.AsistenciaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AsistenciaServiceImplTest {

    private static final LocalDate FECHA_SESION = LocalDate.of(2026, 11, 2);
    private static final LocalDate OTRA_FECHA = LocalDate.of(2026, 11, 3);
    private static final AsistenciaRequestDTO REQUEST =
            new AsistenciaRequestDTO(1L, 2L, FECHA_SESION, EstadoAsistencia.PRESENTE);

    @Mock
    private AsistenciaRepository asistenciaRepository;

    @Mock
    private CatalogoClient catalogoClient;

    @InjectMocks
    private AsistenciaServiceImpl asistenciaService;

    private CatalogoClient.AlumnoRef alumno() {
        return new CatalogoClient.AlumnoRef(1L, "A001", Boolean.TRUE);
    }

    private CatalogoClient.SesionRef sesion(LocalDate fecha) {
        return new CatalogoClient.SesionRef(2L, "CS101", fecha);
    }

    @Test
    void crearRechazaAlumnoInexistente() {
        when(catalogoClient.buscarAlumno(1L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> asistenciaService.crear(REQUEST));

        assertTrue(ex.getMessage().contains("Alumno"));
        verify(asistenciaRepository, never()).save(any());
    }

    @Test
    void crearRechazaSesionInexistente() {
        when(catalogoClient.buscarAlumno(1L)).thenReturn(Optional.of(alumno()));
        when(catalogoClient.buscarSesion(2L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> asistenciaService.crear(REQUEST));

        assertTrue(ex.getMessage().contains("Sesion"));
        verify(asistenciaRepository, never()).save(any());
    }

    @Test
    void crearRechazaFechaDistintaALaSesion() {
        AsistenciaRequestDTO requestConOtraFecha =
                new AsistenciaRequestDTO(1L, 2L, OTRA_FECHA, EstadoAsistencia.PRESENTE);
        when(catalogoClient.buscarAlumno(1L)).thenReturn(Optional.of(alumno()));
        when(catalogoClient.buscarSesion(2L)).thenReturn(Optional.of(sesion(FECHA_SESION)));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> asistenciaService.crear(requestConOtraFecha));

        assertTrue(ex.getMessage().contains("debe coincidir"));
        verify(asistenciaRepository, never()).save(any());
    }

    @Test
    void crearRechazaDuplicado() {
        when(catalogoClient.buscarAlumno(1L)).thenReturn(Optional.of(alumno()));
        when(catalogoClient.buscarSesion(2L)).thenReturn(Optional.of(sesion(FECHA_SESION)));
        when(asistenciaRepository.existsByIdAlumnoAndIdSesionAndFecha(1L, 2L, FECHA_SESION))
                .thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> asistenciaService.crear(REQUEST));
        verify(asistenciaRepository, never()).save(any());
    }

    @Test
    void crearRegistraAsistenciaValida() {
        when(catalogoClient.buscarAlumno(1L)).thenReturn(Optional.of(alumno()));
        when(catalogoClient.buscarSesion(2L)).thenReturn(Optional.of(sesion(FECHA_SESION)));
        when(asistenciaRepository.existsByIdAlumnoAndIdSesionAndFecha(1L, 2L, FECHA_SESION))
                .thenReturn(false);
        when(asistenciaRepository.save(any(Asistencia.class))).thenAnswer(invocation -> {
            Asistencia asistencia = invocation.getArgument(0);
            asistencia.setId(99L);
            return asistencia;
        });

        AsistenciaResponseDTO response = asistenciaService.crear(REQUEST);

        assertEquals(99L, response.id());
        assertEquals(1L, response.idAlumno());
        assertEquals(2L, response.idSesion());
        assertEquals(FECHA_SESION, response.fecha());
        assertEquals(EstadoAsistencia.PRESENTE, response.estado());
    }

    @Test
    void crearPropagaServicioNoDisponible() {
        when(catalogoClient.buscarAlumno(1L))
                .thenThrow(new ServicioNoDisponibleException("alumno-service", new RuntimeException("down")));

        assertThrows(ServicioNoDisponibleException.class, () -> asistenciaService.crear(REQUEST));
        verify(asistenciaRepository, never()).save(any());
    }
}
