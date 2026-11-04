package com.tecsup.asistencia.alumno.repository;

import com.tecsup.asistencia.alumno.entity.Alumno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de persistencia para {@link Alumno}.
 */
@Repository
public interface AlumnoRepository extends JpaRepository<Alumno, Long> {

    Optional<Alumno> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdNot(String codigo, Long id);

    List<Alumno> findByNombresContainingIgnoreCaseOrApellidosContainingIgnoreCaseOrCodigoContainingIgnoreCase(
            String nombres,
            String apellidos,
            String codigo
    );
}
