package com.tecsup.asistencia.sesion.repository;

import com.tecsup.asistencia.sesion.entity.Sesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Repositorio de persistencia para {@link Sesion}.
 */
@Repository
public interface SesionRepository extends JpaRepository<Sesion, Long> {

    List<Sesion> findByCodigoCursoIgnoreCase(String codigoCurso);

    List<Sesion> findByFecha(LocalDate fecha);

    List<Sesion> findByCodigoCursoIgnoreCaseAndFecha(String codigoCurso, LocalDate fecha);

    List<Sesion> findByFechaBetweenOrderByFechaAscHoraInicioAsc(LocalDate desde, LocalDate hasta);

    boolean existsByCodigoCursoIgnoreCaseAndFechaAndHoraInicio(
            String codigoCurso, LocalDate fecha, LocalTime horaInicio);

    boolean existsByCodigoCursoIgnoreCaseAndFechaAndHoraInicioAndIdNot(
            String codigoCurso, LocalDate fecha, LocalTime horaInicio, Long id);
}
