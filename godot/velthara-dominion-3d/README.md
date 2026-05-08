# Velthara Dominion 3D Prototype

Godot 4.6.x battle-test prototype for a 3D Velthara Dominion survivor game.

Current slice:
- Third-person/top-down 3D arena.
- WASD movement.
- Meshy-generated 3D Fire Mage player model.
- Auto-targeting fire/holy projectiles.
- Wave timer and XP pickup.
- Skeleton, evil flower, and fire wyvern enemies.
- Fire wyverns appear at wave 7 and spit fireballs that leave 4-second fire zones.

Open `project.godot` in Godot 4.6.x and run the main scene.

Fire Mage source pipeline:
- Meshy preview/refine GLBs: `assets/meshy/fire_mage/raw/`
- Blender preview render and process script: `assets/meshy/fire_mage/processed/`
- FBX pipeline artifact: `../../artifacts/meshy/fire_mage/fire_mage.fbx`
