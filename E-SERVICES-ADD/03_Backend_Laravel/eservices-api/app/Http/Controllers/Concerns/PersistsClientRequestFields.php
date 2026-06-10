<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Request;
use App\Models\ServiceField;

trait PersistsClientRequestFields
{
    private function persistFieldValues(Request $req, int $serviceId, array $fieldValues): void
    {
        if (empty($fieldValues)) {
            return;
        }

        $serviceFields = ServiceField::where('service_id', $serviceId)->get()->keyBy('id');

        foreach ($fieldValues as $fieldValue) {
            $serviceFieldId = (int) $fieldValue['service_field_id'];
            $value = $fieldValue['value'] ?? null;

            if ($value === '') {
                $value = null;
            }

            $sf = $serviceFields[$serviceFieldId] ?? null;
            if (!$sf) {
                continue;
            }

            if ($sf->type === 'select') {
                $arrValue = $value === null
                    ? null
                    : (is_array($value) ? array_values($value) : [$value]);

                $req->fieldValues()->updateOrCreate(
                    ['service_field_id' => $serviceFieldId],
                    ['value_text' => null, 'value_json' => $arrValue]
                );
            } elseif ($sf->type === 'file') {
                $req->fieldValues()->updateOrCreate(
                    ['service_field_id' => $serviceFieldId],
                    ['value_text' => $value, 'value_json' => null]
                );
            } else {
                $req->fieldValues()->updateOrCreate(
                    ['service_field_id' => $serviceFieldId],
                    ['value_text' => $value, 'value_json' => null]
                );
            }
        }
    }

    /**
     * @return array{0: bool, 1: array<string, array<int, string>>}
     */
    private function validateRequiredFieldsOrErrors(Request $req): array
    {
        $serviceFields = $req->service?->fields ?? collect();

        $requiredFields = $serviceFields->where('required', true)->values();
        $fieldValuesByServiceFieldId = $req->fieldValues
            ? $req->fieldValues->keyBy('service_field_id')
            : collect();

        $errors = [];

        $requiredFileFields = $requiredFields->where('type', 'file')->values();
        if ($requiredFileFields->isNotEmpty()) {
            $docsCount = $req->documents ? $req->documents->count() : 0;
            $requiredDocsCount = $requiredFileFields->count();

            if ($docsCount < $requiredDocsCount) {
                $errors['documents'][] = sprintf(
                    'Documents requis manquants (%d/%d).',
                    $docsCount,
                    $requiredDocsCount
                );
            }
        }

        foreach ($requiredFields as $sf) {
            if ($sf->type === 'file') {
                continue;
            }

            $fv = $fieldValuesByServiceFieldId->get($sf->id);
            if (!$fv) {
                $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" est requis.";
                continue;
            }

            if ($sf->type === 'select') {
                $arr = $fv->value_json;
                $arr = is_array($arr) ? $arr : ($arr === null ? null : [$arr]);

                if ($arr === null || count($arr) === 0) {
                    $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" est requis.";
                    continue;
                }

                $options = is_array($sf->options_json) ? $sf->options_json : [];
                if (!empty($options)) {
                    $invalid = array_values(array_diff($arr, $options));
                    if (!empty($invalid)) {
                        $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" ne correspond pas à une option valide.";
                    }
                }

                continue;
            }

            $valueText = $fv->value_text;
            $valueIsEmpty = $valueText === null || trim((string) $valueText) === '';
            if ($valueIsEmpty) {
                $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" est requis.";
                continue;
            }

            if ($sf->type === 'number') {
                if (!is_numeric((string) $valueText)) {
                    $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" doit être un nombre valide.";
                }
                continue;
            }

            if ($sf->type === 'date') {
                $valueStr = trim((string) $valueText);
                try {
                    $dt = \Carbon\Carbon::createFromFormat('Y-m-d', $valueStr);
                    if ($dt->format('Y-m-d') !== $valueStr) {
                        $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" doit être une date valide (YYYY-MM-DD).";
                    }
                } catch (\Throwable $e) {
                    $errors["field_values.{$sf->id}"][] = "Le champ \"{$sf->label}\" doit être une date valide (YYYY-MM-DD).";
                }
                continue;
            }
        }

        return [empty($errors), $errors];
    }

    private function safeMimeType($file): string
    {
        return 'application/octet-stream';
    }
}
