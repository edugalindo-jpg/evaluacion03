package com.tecsup.asistencia.asistencia.repository;

import com.tecsup.asistencia.asistencia.entity.Asistencia;
import com.tecsup.asistencia.asistencia.entity.EstadoAsistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repositorio de persistencia para {@link Asistencia}.
 * Incluye consultas por alumno y por sesion.
 */
@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {

    @Query("""
            SELECT a FROM Asistencia a
            WHERE a.idAlumno = :idAlumno
            ORDER BY a.fecha DESC, a.id DESC
            """)
    List<Asistencia> buscarPorAlumno(@Param("idAlumno") Long idAlumno);

    @Query("""
            SELECT a FROM Asistencia a
            WHERE a.idSesion = :idSesion
            ORDER BY a.fecha DESC, a.id DESC
            """)
    List<Asistencia> buscarPorSesion(@Param("idSesion") Long idSesion);

    List<Asistencia> findByIdAlumno(Long idAlumno);

    List<Asistencia> findByIdSesion(Long idSesion);

    List<Asistencia> findByIdAlumnoAndIdSesion(Long idAlumno, Long idSesion);

    List<Asistencia> findByFecha(LocalDate fecha);

    List<Asistencia> findByEstado(EstadoAsistencia estado);

    boolean existsByIdAlumnoAndIdSesionAndFecha(Long idAlumno, Long idSesion, LocalDate fecha);

    boolean existsByIdAlumnoAndIdSesionAndFechaAndIdNot(
            Long idAlumno, Long idSesion, LocalDate fecha, Long id);
}
