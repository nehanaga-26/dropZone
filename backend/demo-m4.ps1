# DropZone M4 - 6-step demo. Run in VSCode Terminal 2. Server must be on in Terminal 1.
# Each step prints what success looks like (Slide 9).

$uid = "698ca5b3-20b6-4f6a-a702-0b3c3f3d38a2"
$base = "http://localhost:3000"

Write-Output "=== STEP 0: privacy notice (read to judges) ==="
Write-Output "DropZone checks only if you are inside a zone. Exact location is never shown to others. Posts auto-delete. Say this first."

Write-Output ""
Write-Output "=== STEP 1: enter test zone + lost post ==="
$z = Invoke-RestMethod -Uri "$base/api/zones"
$zid = $z.zones[0].id
Write-Output "zone: $($z.zones[0].name)"
Invoke-RestMethod -Uri "$base/api/zones/$zid/check" -Method Post -ContentType "application/json" -Body '{"useTestMode":true}' | ConvertTo-Json
$lost = @{title="Lost: Blue ID card Main Block"; body="Lost blue ID card near main block"; post_type="lost"; ttlHours=22; author_id=$uid} | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/zones/$zid/posts" -Method Post -ContentType "application/json" -Body $lost | ConvertTo-Json -Depth 4
Write-Output "SUCCESS 1 = inZone true simulated + post with countdown Expires in 22h"

Write-Output ""
Write-Output "=== STEP 2: study-group interest ==="
$study = @{title="Need 2 for ML project Python"; body="Need 2 teammates for ML project, Python"; post_type="general"; ttlHours=5; author_id=$uid} | ConvertTo-Json
$sp = Invoke-RestMethod -Uri "$base/api/zones/$zid/posts" -Method Post -ContentType "application/json" -Body $study
$sp | ConvertTo-Json -Depth 4
$interest = @{title="Interested: ML project"; body="I am interested in ML project"; post_type="general"; ttlHours=5; author_id=$uid} | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/zones/$zid/posts" -Method Post -ContentType "application/json" -Body $interest | ConvertTo-Json -Depth 4
Write-Output "SUCCESS 2 = study post + interest post, both inside zone only"

Write-Output ""
Write-Output "=== STEP 3: expiry (server hides) ==="
$feed1 = Invoke-RestMethod -Uri "$base/api/zones/$zid/posts"
Write-Output "feed count before expire test: $($feed1.posts.Count)"
$expireId = $sp.post.id
node --input-type=module -e "import('./src/lib/supabaseAdmin.js').then(async ({supabaseAdmin}) => { await supabaseAdmin.from('posts').update({expires_at: new Date(Date.now()-1000).toISOString()}).eq('id', '$expireId'); console.log('expired:'+'$expireId'); })"
Start-Sleep -Seconds 1
$feed2 = Invoke-RestMethod -Uri "$base/api/zones/$zid/posts"
Write-Output "feed count after forcing 1 post expired: $($feed2.posts.Count) (must be 1 less)"
Write-Output "SUCCESS 3 = every post has countdown; expired rows never return (WHERE expires_at > now())."

Write-Output ""
Write-Output "=== STEP 4: report -> moderator remove ==="
$posts = Invoke-RestMethod -Uri "$base/api/zones/$zid/posts"
$postId = $posts.posts[0].id
$repBody = @{post_id=$postId; reporter_id=$uid; reason="spam test for demo"} | ConvertTo-Json
$rep = Invoke-RestMethod -Uri "$base/api/reports" -Method Post -ContentType "application/json" -Body $repBody
$repId = @($rep.report.id)[0]
Write-Output "reported: $repId"
Start-Sleep -Seconds 1
Invoke-RestMethod -Uri "$base/api/moderation/queue" | ConvertTo-Json -Depth 3
Start-Sleep -Seconds 1
Invoke-RestMethod -Uri "$base/api/moderation/$repId/review" -Method Post -ContentType "application/json" -Headers @{"x-role"="moderator"} -Body '{"action":"remove"}' | ConvertTo-Json -Depth 4
Write-Output "SUCCESS 4 = queue had 1, after remove queue 0 and post gone from feed"
Invoke-RestMethod -Uri "$base/api/zones/$zid/posts" | ConvertTo-Json -Depth 3

Write-Output ""
Write-Output "=== STEP 5: deny / bad location ==="
Invoke-RestMethod -Uri "$base/api/zones/$zid/check" -Method Post -ContentType "application/json" -Body '{"lat":17.6868,"lng":83.2185,"accuracy":200}' | ConvertTo-Json
Invoke-RestMethod -Uri "$base/api/zones/$zid/check" -Method Post -ContentType "application/json" -Body '{"lat":19.0,"lng":83.0,"accuracy":10}' | ConvertTo-Json
Write-Output "SUCCESS 5 = low accuracy says retry:true; far says inZone false. App then offers test zone."

Write-Output ""
Write-Output "=== STEP 6: leave zone ==="
Write-Output "Clear selected zone in app and block feed calls. Privacy notice shown again."
Write-Output "SUCCESS 6 = no zone selected -> no feed access."

Write-Output ""
Write-Output "M4 DONE if all 6 SUCCESS lines seen."
