package com.tecsup.asistencia.sesion.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/sesiones");

    @Test
    void recursoInexistenteDevuelve404() {
        var response = handler.handleNoResource(
                new NoResourceFoundException(HttpMethod.GET, "no-existe"), request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().status());
    }

    @Test
    void metodoNoSoportadoDevuelve405() {
        var response = handler.handleMethodNotSupported(
                new HttpRequestMethodNotSupportedException("PATCH", List.of("GET", "POST")), request);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertEquals(405, response.getBody().status());
    }

    @Test
    void tipoDeContenidoNoSoportadoDevuelve415() {
        var response = handler.handleMediaTypeNotSupported(
                new HttpMediaTypeNotSupportedException(
                        MediaType.TEXT_PLAIN, List.of(MediaType.APPLICATION_JSON)), request);

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertEquals(415, response.getBody().status());
    }

    @Test
    void parametroFaltanteDevuelve400() {
        var response = handler.handleMissingParameter(
                new MissingServletRequestParameterException("fecha", "String"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, response.getBody().status());
    }

    @Test
    void errorInesperadoDevuelve500() {
        var response = handler.handleGeneric(new RuntimeException("boom"), request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals(500, response.getBody().status());
    }
}
