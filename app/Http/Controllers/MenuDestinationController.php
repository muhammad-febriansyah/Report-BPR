<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MenuDestinationController extends Controller
{
    public function show(Request $request, Menu $menu): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 404);
        abort_unless(Gate::forUser($user)->allows('view', $menu), 404);
        $menu->load('page');

        $menuRecords = Menu::query()
            ->select(['id', 'parent_id', 'name'])
            ->get()
            ->keyBy('id');

        $breadcrumbs = [];
        $visitedIds = [$menu->id => true];
        $parentId = $menu->parent_id;

        while ($parentId !== null) {
            $parent = $menuRecords->get($parentId);

            if ($parent === null || isset($visitedIds[$parent->id])) {
                break;
            }

            $visitedIds[$parent->id] = true;
            array_unshift($breadcrumbs, [
                'title' => $parent->name,
                'href' => route('menu-destination.show', $parent->id, absolute: false),
            ]);
            $parentId = $parent->parent_id;
        }

        $breadcrumbs[] = ['title' => $menu->name];

        return Inertia::render('menu-destinations/show', [
            'menu' => [
                'title' => $menu->name,
                'route_name' => $menu->route_name,
                'page_type' => $menu->page?->page_type,
                'iframe_url' => $menu->page?->status === true ? $menu->page->iframe_url : null,
                'iframe_title' => $menu->page?->iframe_title,
                'iframe_description' => $menu->page?->iframe_description,
            ],
            'breadcrumbs' => $breadcrumbs,
        ]);
    }
}
