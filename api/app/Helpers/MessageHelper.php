<?php

namespace App\Helpers;

class MessageHelper
{
    public static function make(string $entity, string $action): string
    {
        $map = [
            'store' => "{$entity} registrado correctamente",
            'update' => "{$entity} actualizado correctamente",
            'destroy' => "{$entity} eliminado correctamente",
            'index' => "Listado de {$entity}",
            'show' => "Detalle de {$entity}",
            'accepted' => "{$entity} aceptado para procesamiento",
        ];

        return $map[$action] ?? "{$entity}: {$action}";
    }
}
