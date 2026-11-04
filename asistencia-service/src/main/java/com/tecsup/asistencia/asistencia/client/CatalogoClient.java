package com.tecsup.asistencia.asistencia.client;

import com.tecsup.asistencia.asistencia.exception.ServicioNoDisponibleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Cliente HTTP para validar que el alumno y la sesion referenciados existan.
 * Cada microservicio mantiene su propia base de datos, por lo que la
 * integridad referencial se comprueba en la capa de servicio.
 */
@Component
public class CatalogoClient {

    private final RestClient alumnoClient;
    private final RestClient sesionClient;

    public CatalogoClient(
            @Value("${services.alumno.url:http://localhost:8081}") String alumnoUrl,
            @Value("${services.sesion.url:http://localhost:8082}") String sesionUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(3));

        this.alumnoClient = RestClient.builder()
                .baseUrl(alumnoUrl)
                .requestFactory(requestFactory)
                .build();
        this.sesionClient = RestClient.builder()
                .baseUrl(sesionUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public Optional<AlumnoRef> buscarAlumno(Long id) {
        try {
            AlumnoRef alumno = alumnoClient.get()
                    .uri("/api/alumnos/{id}", id)
                    .retrieve()
                    .body(AlumnoRef.class);
            return Optional.ofNullable(alumno);
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException ex) {
            throw new ServicioNoDisponibleException("alumno-service", ex);
        }
    }

    public Optional<SesionRef> buscarSesion(Long id) {
        try {
            SesionRef sesion = sesionClient.get()
                    .uri("/api/sesiones/{id}", id)
                    .retrieve()
                    .body(SesionRef.class);
            return Optional.ofNullable(sesion);
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException ex) {
            throw new ServicioNoDisponibleException("sesion-service", ex);
        }
    }

    public record AlumnoRef(Long id, String codigo, Boolean estado) {
    }

    public record SesionRef(Long id, String codigoCurso, LocalDate fecha) {
    }
}
