# Runbook de Rollback de Catálogo

## Objetivo

Volver rápidamente a una versión estable del catálogo si una publicación introduce errores funcionales.

## Estrategia recomendada

1. Mantener snapshot SQL previo a cada release.
2. Si hay falla crítica:
- opción A: restaurar snapshot completo de catálogo.
- opción B: despublicar receta defectuosa (`is_published=false`) como mitigación inmediata.

## SQL de mitigación rápida (despublicar receta)

```sql
update public.recipes
set is_published = false, updated_at = now()
where id = 'recipe-id-a-despublicar';
```

## SQL de validación post-rollback

```sql
select id, name, is_published
from public.recipes
order by name;
```

```sql
select r.id, r.name
from public.recipes r
left join public.recipe_substeps s on s.recipe_id = r.id
where r.is_published = true
group by r.id, r.name
having count(s.id) = 0;
```

Debe devolver 0 filas en la segunda consulta.

