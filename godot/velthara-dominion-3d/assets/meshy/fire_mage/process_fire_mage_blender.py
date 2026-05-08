import bmesh
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
PROCESSED = ROOT / "processed"
PROCESSED.mkdir(parents=True, exist_ok=True)

ASSET_ID = "fire_mage"
SOURCE = RAW / "fire_mage_refined.glb"
TARGET_TRIS = 12000

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.textures):
    for datablock in list(coll):
        if datablock.users == 0:
            coll.remove(datablock)

bpy.ops.import_scene.gltf(filepath=str(SOURCE))
parts = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not parts:
    raise RuntimeError(f"No mesh objects imported from {SOURCE}")

bpy.ops.object.select_all(action="DESELECT")
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
if len(parts) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
obj.name = ASSET_ID
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
z_min = min(v.z for v in verts)
z_max = max(v.z for v in verts)
height = max(0.001, z_max - z_min)
counts = []
slabs = 40
band = 0.30 * height
for i in range(slabs):
    z_lo = z_min + i * band / slabs
    z_hi = z_min + (i + 1) * band / slabs
    counts.append((z_hi, sum(1 for v in verts if z_lo <= v.z < z_hi)))
upper = sorted(c for _, c in counts[slabs // 2:])
baseline = upper[len(upper) // 2] if upper else 1
threshold = 3 * max(baseline, 200)
spike_zs = [z for z, c in counts if c > threshold]
plinth_removed = False
if spike_zs:
    cut_z = min(max(spike_zs) + 0.005 * height, z_min + 0.18 * height)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    mw = obj.matrix_world
    to_delete = [v for v in bm.verts if (mw @ v.co).z < cut_z]
    if to_delete:
        bmesh.ops.delete(bm, geom=to_delete, context="VERTS")
        plinth_removed = True
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.001)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.mesh.quads_convert_to_tris(quad_method="BEAUTY", ngon_method="BEAUTY")
bpy.ops.object.mode_set(mode="OBJECT")

current = len(obj.data.polygons)
iteration = 0
while current > TARGET_TRIS and iteration < 5:
    ratio = max(min((TARGET_TRIS / current) * (0.88 if iteration == 0 else 0.95), 0.99), 0.01)
    mod = obj.modifiers.new(f"D{iteration}", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
    new_count = len(obj.data.polygons)
    if new_count >= current * 0.99:
        break
    current = new_count
    iteration += 1

for mat in obj.data.materials:
    if mat and mat.use_nodes:
        if not mat.name.startswith("MAT_"):
            mat.name = f"MAT_{ASSET_ID}_{mat.name}"
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Metallic"].default_value = 0.05
            bsdf.inputs["Roughness"].default_value = 0.86

bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
obj.rotation_euler[0] = -math.radians(90)
bpy.ops.object.transform_apply(rotation=True)

bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
fbx_path = PROCESSED / "fire_mage.fbx"
bpy.ops.export_scene.fbx(
    filepath=str(fbx_path),
    use_selection=True,
    apply_unit_scale=True,
    apply_scale_options="FBX_SCALE_NONE",
    bake_space_transform=True,
    object_types={"MESH"},
    use_mesh_modifiers=True,
    mesh_smooth_type="FACE",
    embed_textures=True,
    path_mode="COPY",
    axis_forward="-Z",
    axis_up="Y",
)

camera = bpy.data.objects.new("PreviewCamera", bpy.data.cameras.new("PreviewCamera"))
bpy.context.collection.objects.link(camera)
camera.location = (0, -6, 2.3)
camera.rotation_euler = (math.radians(72), 0, 0)
bpy.context.scene.camera = camera
light = bpy.data.objects.new("PreviewKey", bpy.data.lights.new("PreviewKey", "AREA"))
bpy.context.collection.objects.link(light)
light.location = (0, -4, 5)
light.data.energy = 550
light.data.size = 4
bpy.context.scene.render.resolution_x = 900
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.eevee.taa_render_samples = 64 if hasattr(bpy.context.scene, "eevee") else 16
bpy.ops.wm.save_as_mainfile(filepath=str(PROCESSED / "fire_mage.blend"))
bpy.ops.render.render(write_still=True)
bpy.data.images["Render Result"].save_render(filepath=str(PROCESSED / "fire_mage_preview.png"))

print({
    "fbx": str(fbx_path),
    "tris": len(obj.data.polygons),
    "verts": len(obj.data.vertices),
    "plinth_removed": plinth_removed,
})
