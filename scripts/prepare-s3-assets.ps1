# Prepare assets for S3 upload
# This script copies and renames all game assets to a structured folder for S3 upload

$sourceDir = "games-server/public/veltharas-dominion"
$outputDir = "s3-upload/veltharas-dominion"

# Create output directories
$dirs = @(
    "$outputDir/characters",
    "$outputDir/enemies", 
    "$outputDir/minions",
    "$outputDir/effects",
    "$outputDir/items",
    "$outputDir/abilities",
    "$outputDir/ui",
    "$outputDir/audio"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "Created directory structure" -ForegroundColor Green

# Define file mappings: source -> destination
$mappings = @{
    # Characters - Fire Mage
    "Level1Mage.png" = "characters/fire-mage-lv1.png"
    "Level2Mage.png" = "characters/fire-mage-lv5.png"
    "Level3.png" = "characters/fire-mage-lv10.png"
    "Level4Mage.png" = "characters/fire-mage-lv15.png"
    "Level5Mage.png" = "characters/fire-mage-lv20.png"
    "Level6Mage.png" = "characters/fire-mage-lv25.png"
    
    # Characters - Shadow Monarch
    "shadow_monarch_level1.png" = "characters/shadow-monarch-lv1.png"
    "shadow_monarch_level5.png" = "characters/shadow-monarch-lv5.png"
    "shadow_monarch_level10.png" = "characters/shadow-monarch-lv10.png"
    "shadow_monarch_level15.png" = "characters/shadow-monarch-lv15.png"
    
    # Characters - Necromancer
    "Standing-removebg-preview.png" = "characters/necromancer-idle.png"
    "Walking-removebg-preview.png" = "characters/necromancer-walk.png"
    "Dead-removebg-preview.png" = "characters/necromancer-dead.png"
    
    # Enemies
    "swarm.png" = "enemies/swarm.png"
    "basicenemy.png" = "enemies/basic.png"
    "RunnerEnemy.png" = "enemies/runner.png"
    "TankEnemy.png" = "enemies/tank.png"
    "BomberEnemy.png" = "enemies/bomber.png"
    "TinyEnemy.png" = "enemies/mini.png"
    "Splitter.png" = "enemies/splitter.png"
    "StickyEnemy.png" = "enemies/sticky.png"
    "IceEnemy.png" = "enemies/ice.png"
    "Poison.png" = "enemies/poison.png"
    "goblin.png" = "enemies/goblin.png"
    "necromancer.png" = "enemies/necromancer-enemy.png"
    "sprite.png" = "enemies/necro-sprite.png"
    "miniconsumer.png" = "enemies/mini-consumer.png"
    "BossEnemy.png" = "enemies/boss-consumer.png"
    "affafb7e-20ab-48d6-aa16-726fa9b54c9c-removebg-preview.png" = "enemies/the-consumer.png"
    "DemonKing.png" = "enemies/demon-king.png"
    
    # Minions
    "WolfStanding-removebg-preview.png" = "minions/wolf-idle.png"
    "WolfRunning-removebg-preview.png" = "minions/wolf-run.png"
    "WolfRunning2-removebg-preview.png" = "minions/wolf-run-alt.png"
    "WolfBitting-removebg-preview.png" = "minions/wolf-attack.png"
    
    # Effects
    "Fireball.png" = "effects/fireball.png"
    "RingOfFire.png" = "effects/ring-of-fire.png"
    "ring_of_fire.png" = "effects/ring-of-fire-aura.png"
    "devil_ring_of_fire.png" = "effects/devil-ring-of-fire.png"
    "demonic-fire-mythic.png" = "effects/demonic-fire-mythic.png"
    
    # Skulls
    "1ec244e0-23e0-4582-866c-10c9705ee8b1-removebg-preview.png" = "items/skull-fire.png"
    "23758cbd-26db-454a-b5f7-cfb21a00d678-removebg-preview.png" = "items/skull-slow.png"
    "5e6439b6-6125-4cc8-bcf4-acf56e524b72-removebg-preview.png" = "items/skull-dark.png"
    "0a93e9de-a767-4d80-9df3-e21ca59d8319-removebg-preview.png" = "items/skull-lightning.png"
    
    # Stacking Items
    "1d6bda2b-9e6a-4e43-aa19-9edcf1a91255.jpg" = "items/beam-despair.jpg"
    "916b5e75-0b5b-4e95-a550-c84fbfe0a268.jpg" = "items/beam-despair-evolved.jpg"
    "e6ae531e-f976-4598-9cb1-3645d62a2d0a.jpg" = "items/crit-blade.jpg"
    "151435d5-709b-4fb5-ab63-216453fa472d.jpg" = "items/crit-blade-evolved.jpg"
    "bdd432b1-e52d-43fa-b591-20759c11bd7b.jpg" = "items/ring-xp.jpg"
    "aa38aa35-9eca-4b7c-9a43-7dbd2981b7d8.jpg" = "items/ring-xp-evolved.jpg"
    "f8ac43e1-63f9-4aac-9a62-bd7435a93b2b.jpg" = "items/soul-collector.jpg"
    "f3e8ed8c-0406-4cbe-a85b-4d925bffb445.jpg" = "items/soul-collector-evolved.jpg"
    "b8ed813f-ac3d-4cfe-91c0-5e8b3c82cb84-removebg-preview.png" = "items/boots-swiftness.png"
    "a2d729b4-7e35-4961-a88e-bac4cc28398d-removebg-preview.png" = "items/boots-swiftness-evolved.png"
    "53ded777-5832-47cf-8640-4c0c5e933582.jpg" = "items/heart-vitality.jpg"
    "c81ba2ce-1664-4f4c-83c7-c7cf898e1116.jpg" = "items/heart-vitality-evolved.jpg"
    "d7f4391a-1877-4d7a-89c2-fa09b95fa006.jpg" = "items/blood-soaker.jpg"
    "977daf8c-4a8b-43bb-ac0f-3abd5824a2ad.jpg" = "items/blood-soaker-evolved.jpg"
    
    # Demon Set
    "0770a100-e29d-4325-8741-9951ba4affcd.jpg" = "items/demon-helm.jpg"
    "deee24a8-9020-43ea-8fc9-cef4b810b858.jpg" = "items/demon-chest.jpg"
    "d8a16809-cbe3-4b78-a63c-e974e12aba1d.jpg" = "items/demon-boots.jpg"
    
    # Abilities
    "0a9fd5ff-f2e6-4a80-8788-d21979342ffc.jpg" = "abilities/dash.jpg"
    "a8ed4028-237c-4ba6-b084-c92b9176c417.jpg" = "abilities/nuclear-blast.jpg"
    
    # UI
    "velthara-bg.jpg" = "ui/velthara-bg.jpg"
    "dots_survivor_thumbnail.png" = "ui/velthara-thumbnail.png"
    
    # Audio
    "game-music.mp3" = "audio/game-music.mp3"
    "menu-music.mp3" = "audio/menu-music.mp3"
    "boss-music.mp3" = "audio/boss-music.mp3"
    "fireball-sound.mp3" = "audio/fireball.mp3"
    "beam-sound.mp3" = "audio/beam.mp3"
    "levelup-sound.mp3" = "audio/levelup.mp3"
    "wolf-howl.mp3" = "audio/wolf-howl.mp3"
    "horde-sound.mp3" = "audio/horde.mp3"
    "game-start-voice.mp3" = "audio/game-start.mp3"
    "The_End_is_Near_2026-01-31T044536.mp3" = "audio/the-end-is-near.mp3"
}

$copied = 0
$missing = 0

foreach ($source in $mappings.Keys) {
    $sourcePath = Join-Path $sourceDir $source
    $destPath = Join-Path $outputDir $mappings[$source]
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        Write-Host "  Copied: $source -> $($mappings[$source])" -ForegroundColor Cyan
        $copied++
    } else {
        Write-Host "  Missing: $source" -ForegroundColor Yellow
        $missing++
    }
}

Write-Host "`nDone! Copied $copied files, $missing missing" -ForegroundColor Green
Write-Host "Output folder: $outputDir" -ForegroundColor Green
Write-Host "`nTo upload to S3, run:" -ForegroundColor Yellow
Write-Host "aws s3 sync $outputDir s3://YOUR-BUCKET-NAME/veltharas-dominion --acl public-read" -ForegroundColor White

