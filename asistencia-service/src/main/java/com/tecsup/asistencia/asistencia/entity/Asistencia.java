package com.tecsup.asistencia.asistencia.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Representa la asistencia de un alumno a una sesion de clase.
 * Los identificadores de alumno y sesion son referencias logicas a los
 * microservicios de alumnos y sesiones (bases de datos independientes).
 * La unicidad (id_alumno, id_sesion, fecha) se crea mediante schema.sql.
 */
@Entity
@Table(name = "asistencias", uniqueConstraints = @UniqueConstraint(
        name = "uk_asistencia_alumno_sesion_fecha", columnNames = {"id_alumno", "id_sesion", "fecha"}))
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_alumno", nullable = false)
    private Long idAlumno;

    @Column(name = "id_sesion", nullable = false)
    private Long idSesion;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoAsistencia estado;

    public Asistencia() {
        // Constructor requerido por JPA
    }

    public Asistencia(Long idAlumno, Long idSesion, LocalDate fecha, EstadoAsistencia estado) {
        this.idAlumno = idAlumno;
        this.idSesion = idSesion;
        this.fecha = fecha;
        this.estado = estado;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getIdAlumno() {
        return idAlumno;
    }

    public void setIdAlumno(Long idAlumno) {
        this.idAlumno = idAlumno;
    }

    public Long getIdSesion() {
        return idSesion;
    }

    public void setIdSesion(Long idSesion) {
        this.idSesion = idSesion;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public EstadoAsistencia getEstado() {
        return estado;
    }

    public void setEstado(EstadoAsistencia estado) {
        this.estado = estado;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Asistencia asistencia)) {
            return false;
        }
        return id != null && Objects.equals(id, asistencia.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "Asistencia{id=" + id + ", idAlumno=" + idAlumno + ", idSesion=" + idSesion
                + ", fecha=" + fecha + ", estado=" + estado + "}";
    }
}
