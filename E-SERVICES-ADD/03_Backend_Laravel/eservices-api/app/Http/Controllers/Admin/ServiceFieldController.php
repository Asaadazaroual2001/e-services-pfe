<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAgencyService;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceFieldRequest;
use App\Http\Requests\UpdateServiceFieldRequest;
use App\Models\Service;
use App\Models\ServiceField;
use Illuminate\Http\Request;

class ServiceFieldController extends Controller
{
    use AuthorizesAgencyService;

    /**
     * Display a listing of fields for a specific service.
     * GET /api/admin/services/{service}/fields
     */
    public function index(Service $service)
    {
        $this->assertCanManageService($service);

        return response()->json([
            'success' => true,
            'data' => $service->fields()->orderBy('order')->get(),
        ]);
    }

    /**
     * Store a newly created field.
     * POST /api/admin/service-fields
     */
    public function store(StoreServiceFieldRequest $request)
    {
        $service = Service::findOrFail($request->input('service_id'));
        $this->assertCanManageService($service);

        $field = ServiceField::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Champ créé avec succès',
            'data' => $field,
        ], 201);
    }

    /**
     * Update the specified field.
     * PUT /api/admin/service-fields/{field}
     */
    public function update(UpdateServiceFieldRequest $request, ServiceField $field)
    {
        $field->loadMissing('service');
        $this->assertCanManageService($field->service);

        $field->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Champ mis à jour avec succès',
            'data' => $field,
        ]);
    }

    /**
     * Remove the specified field.
     * DELETE /api/admin/service-fields/{field}
     */
    public function destroy(ServiceField $field)
    {
        $field->loadMissing('service');
        $this->assertCanManageService($field->service);

        $field->delete();

        return response()->json([
            'success' => true,
            'message' => 'Champ supprimé avec succès',
        ]);
    }

    /**
     * Reorder fields for a service.
     * POST /api/admin/services/{service}/fields/reorder
     */
    public function reorder(Request $request, Service $service)
    {
        $this->assertCanManageService($service);

        $request->validate([
            'field_ids' => ['required', 'array'],
            'field_ids.*' => ['integer', 'exists:service_fields,id'],
        ]);

        $fieldIds = $request->input('field_ids');

        foreach ($fieldIds as $order => $fieldId) {
            ServiceField::where('id', $fieldId)
                ->where('service_id', $service->id)
                ->update(['order' => $order]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ordre des champs mis à jour avec succès',
            'data' => $service->fields()->orderBy('order')->get(),
        ]);
    }
}
