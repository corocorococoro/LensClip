<?php

namespace App\Policies;

use App\Models\Observation;
use App\Models\User;

class ObservationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id;
    }

    /**
     * Determine whether the user can retry the observation.
     */
    public function retry(User $user, Observation $observation): bool
    {
        return $user->id === $observation->user_id && $observation->status === 'failed';
    }
}
