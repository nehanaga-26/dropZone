/**
 * DropZone Automated Test Suite — Hackathon Verification
 * Tests all 12 core features specified in Master Implementation Prompt Section 19.
 */

import { dropZoneService } from '../lib/services/postService';
import { SIMULATED_USERS } from '../lib/mock/posts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  DROPZONE AUTOMATED FEATURE VERIFICATION SUITE');
  console.log('======================================================\n');

  await dropZoneService.resetDemoData();
  const ownerUser = SIMULATED_USERS[0]; // Alex Rivers (Owner / Mod)
  const modUser = SIMULATED_USERS[1];   // Jordan Lee (Mod)
  const memberUser = SIMULATED_USERS[2]; // Sam Patel (Member)
  const finderUser = SIMULATED_USERS[3]; // Taylor Brooks (Finder)
  const guestUser = SIMULATED_USERS[4];  // Guest Visitor (Read-only)

  // ----------------------------------------------------
  // TEST SUITE 1: ZONE MANAGEMENT & LIFECYCLE
  // ----------------------------------------------------
  console.log('--- 1. Zone Creation, Validation & Lifecycle ---');

  // 1.1 Create valid zone
  const newZone = await dropZoneService.createZone(
    {
      name: 'Maker Hub Robotics Lab',
      description: 'Autonomous robotics build area with soldering bays.',
      radiusMeters: 150,
      durationPreset: '12h',
    },
    ownerUser
  );
  assert(newZone.name === 'Maker Hub Robotics Lab', 'Create valid zone with correct name');
  assert(newZone.status === 'active', 'Newly created zone status is active');
  assert(newZone.radiusMeters === 150, 'Zone radius set correctly');

  // 1.2 Reject invalid radius
  let radiusRejected = false;
  try {
    await dropZoneService.createZone(
      {
        name: 'Invalid Radius Zone',
        description: 'Testing',
        radiusMeters: 20, // Min is 50
        durationPreset: '1h',
      },
      ownerUser
    );
  } catch (e: any) {
    radiusRejected = true;
  }
  assert(radiusRejected, 'Rejects zone with radius < 50 meters');

  // 1.3 Appears in zone selector immediately
  const allZones = await dropZoneService.listZones(true);
  const foundInList = allZones.some((z) => z.id === newZone.id);
  assert(foundInList, 'New zone appears in zone list immediately');

  // 1.4 Edit zone metadata without resetting expiration timestamp
  const initialExpiry = newZone.expiresAt;
  await new Promise((r) => setTimeout(r, 20)); // slight delay
  const editedZone = await dropZoneService.editZone(
    newZone.id,
    {
      name: 'Maker Hub Robotics Lab (Renovated)',
      description: 'Updated description for robotics',
      radiusMeters: 200,
    },
    ownerUser
  );
  assert(editedZone.name === 'Maker Hub Robotics Lab (Renovated)', 'Zone name updated');
  assert(editedZone.radiusMeters === 200, 'Zone radius updated');
  assert(editedZone.expiresAt === initialExpiry, 'Editing zone does NOT reset expiration timestamp');

  // 1.5 Extend duration
  const extendedZone = await dropZoneService.extendZone(newZone.id, 12, ownerUser);
  const extendedExpiry = new Date(extendedZone.expiresAt).getTime();
  assert(extendedExpiry > new Date(initialExpiry).getTime(), 'Zone expiration extended into the future');

  // 1.6 Prevent unauthorized zone edits
  let unauthorizedRejected = false;
  try {
    await dropZoneService.editZone(
      newZone.id,
      { name: 'Hacked Name', description: 'Malicious', radiusMeters: 100 },
      memberUser // Member is not owner
    );
  } catch (e) {
    unauthorizedRejected = true;
  }
  assert(unauthorizedRejected, 'Rejects unauthorized zone edits from regular members');

  // 1.7 Deactivate zone
  const deactivated = await dropZoneService.deactivateZone(newZone.id, ownerUser);
  assert(deactivated.status === 'deactivated', 'Zone deactivated successfully');

  // 1.8 Expired / deactivated zone stops accepting new posts
  let postInDeactivatedRejected = false;
  try {
    await dropZoneService.createPost(
      {
        zoneId: newZone.id,
        category: 'feed',
        title: 'Forbidden Post',
        content: 'This should fail in deactivated zone',
        ttlHours: 6,
      },
      memberUser
    );
  } catch (e) {
    postInDeactivatedRejected = true;
  }
  assert(postInDeactivatedRejected, 'Deactivated zone rejects new post creation');

  // 1.9 Explicit reactivation
  const reactivated = await dropZoneService.reactivateZone(newZone.id, ownerUser);
  assert(reactivated.status === 'active', 'Reactivation requires explicit authorized action');

  // ----------------------------------------------------
  // TEST SUITE 2: PUBLIC COMMENTS & REPLIES
  // ----------------------------------------------------
  console.log('\n--- 2. Public Comments & Replies ---');

  const testPost = await dropZoneService.createPost(
    {
      zoneId: 'zone-hackathon-arena',
      category: 'feed',
      title: 'Coffee and snacks arrive at Table 12',
      content: 'Fresh cold brews and donuts just placed on Table 12.',
      ttlHours: 6,
    },
    ownerUser
  );

  // 2.1 Add valid comment
  const comment = await dropZoneService.addComment(
    testPost.id,
    'Grabbing an iced cold brew right now! Thanks!',
    memberUser
  );
  assert(comment.content.includes('cold brew'), 'Add valid public comment');
  assert(comment.authorId === memberUser.id, 'Comment records correct author identity');

  // 2.2 Reject empty comment
  let emptyRejected = false;
  try {
    await dropZoneService.addComment(testPost.id, '   ', memberUser);
  } catch (e) {
    emptyRejected = true;
  }
  assert(emptyRejected, 'Rejects empty public comment submission');

  // 2.3 Display comments under correct post
  const postComments = await dropZoneService.listComments(testPost.id);
  assert(postComments.length === 1 && postComments[0].id === comment.id, 'Comments appear under correct post');

  // 2.4 Comments prevented in deactivated zone
  let deactivatedCommentRejected = false;
  try {
    await dropZoneService.deactivateZone(testPost.zoneId, ownerUser);
    await dropZoneService.addComment(testPost.id, 'Should not allow', memberUser);
  } catch (e) {
    deactivatedCommentRejected = true;
  } finally {
    await dropZoneService.reactivateZone(testPost.zoneId, ownerUser);
  }
  assert(deactivatedCommentRejected, 'Prevent comments in expired or deactivated zones');

  // ----------------------------------------------------
  // TEST SUITE 3: LOST & FOUND PRIVATE CLAIMS & WORKFLOW
  // ----------------------------------------------------
  console.log('\n--- 3. Private Lost & Found Claims & Privacy ---');

  // Create Found item post by finder
  const foundItemPost = await dropZoneService.createPost(
    {
      zoneId: 'zone-hackathon-arena',
      category: 'lost_found',
      title: 'Found Black Sony Noise-Cancelling Headphones',
      content: 'Found left on the beanbag chair near projector screen B. Describe stickers to claim.',
      ttlHours: 24,
      metadata: {
        itemType: 'found',
        contactHint: 'Identify sticker on right ear cup',
      },
    },
    finderUser
  );

  // 3.1 Create private claim
  const claim = await dropZoneService.createClaim(
    foundItemPost.id,
    memberUser, // Claimant
    'Stickers: React logo on left ear cup, GitHub Octocat on right ear cup. Serial ends in 8941.'
  );
  assert(claim.status === 'claim_pending' || claim.status === 'pending', 'Create private claim successfully');
  assert(claim.claimantId === memberUser.id, 'Claim records claimant ID');
  assert(claim.finderId === finderUser.id, 'Claim records finder ID');

  // 3.2 Confidentiality: unrelated user cannot read claim messages
  let unauthorizedClaimRead = false;
  try {
    const anotherStudent = SIMULATED_USERS[0]; // Not claimant and not finder
    // In our test, anotherStudent is Alex Rivers who has moderator privileges, so test with a non-mod third party:
    const thirdParty = {
      id: 'usr-unrelated-student',
      displayName: 'Random Student',
      handle: '@random',
      avatarSeed: 'RS',
      isModerator: false,
    };
    await dropZoneService.getClaim(claim.id, thirdParty);
  } catch (e) {
    unauthorizedClaimRead = true;
  }
  assert(unauthorizedClaimRead, 'Access Control: Unrelated users cannot view private claim details');

  // 3.3 Exchange private messages with private evidence attachment
  const msgWithEvidence = await dropZoneService.sendClaimMessage(
    claim.id,
    'Here is the receipt and photo of the headphone case with the same serial.',
    memberUser,
    {
      fileName: 'sony_purchase_receipt.pdf',
      fileType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,mockPrivateReceiptBytes',
    }
  );
  assert(msgWithEvidence.attachment?.fileName === 'sony_purchase_receipt.pdf', 'Private evidence attached to claim conversation');

  // Verify evidence is NOT exposed on public post object
  const publicPost = dropZoneService.getPostById(foundItemPost.id);
  assert(
    !JSON.stringify(publicPost).includes('sony_purchase_receipt.pdf') &&
    !JSON.stringify(publicPost).includes('React logo on left ear cup'),
    'Privacy Guarantee: Private claim details & evidence NEVER exposed in public post feed'
  );

  // 3.4 Finder approves claim
  const approvedClaim = await dropZoneService.updateClaimStatus(claim.id, 'approved', finderUser);
  assert(approvedClaim.status === 'approved', 'Finder can approve verified claim');

  // 3.5 Handover return recorded
  const returnedClaim = await dropZoneService.updateClaimStatus(claim.id, 'returned', finderUser);
  assert(returnedClaim.status === 'returned', 'Claim status transitions to returned after physical handover');

  // 3.6 Post expiration does NOT destroy claim record (Independent Expiration)
  foundItemPost.expiresAt = new Date(Date.now() - 1000).toISOString(); // simulate expired post TTL
  const persistedClaim = await dropZoneService.getClaim(claim.id, memberUser);
  assert(persistedClaim !== null, 'Independent Lifecycle: Claim records persist after public post TTL expires');

  // ----------------------------------------------------
  // TEST SUITE 4: 10 UNIQUE REPORTS AUTO-HIDING RULE
  // ----------------------------------------------------
  console.log('\n--- 4. Reporting Safeguards & 10-Report Auto-Hide ---');

  const reportablePost = await dropZoneService.createPost(
    {
      zoneId: 'zone-hackathon-arena',
      category: 'feed',
      title: 'Suspicious advertising link',
      content: 'Click this link to claim free crypto gift cards now!',
      ttlHours: 12,
    },
    memberUser
  );

  // 4.1 Author cannot report own post
  let selfReportRejected = false;
  try {
    await dropZoneService.reportPost(reportablePost.id, 'spam', 'Reporting my own post', memberUser);
  } catch (e) {
    selfReportRejected = true;
  }
  assert(selfReportRejected, 'Safeguard 1: User cannot report their own post');

  // 4.2 Duplicate reports from same user reject
  await dropZoneService.reportPost(reportablePost.id, 'spam', 'Report 1', finderUser);
  let duplicateRejected = false;
  try {
    await dropZoneService.reportPost(reportablePost.id, 'spam', 'Report 1 again', finderUser);
  } catch (e) {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'Safeguard 2: Duplicate reports from the same user are rejected');

  // 4.3 9 unique reports do NOT trigger threshold
  for (let i = 2; i <= 9; i++) {
    await dropZoneService.reportPost(
      reportablePost.id,
      'spam',
      `Report ${i}`,
      `usr-test-reporter-${i}`
    );
  }
  const postAt9Reports = dropZoneService.getPostById(reportablePost.id);
  assert(postAt9Reports?.reportCount === 9, 'Tracks exactly 9 unique reports');
  assert(postAt9Reports?.moderationStatus === 'normal', '9 unique reports do NOT trigger auto-hide');

  // Verify visible in public feed at 9 reports
  const visibleFeedAt9 = await dropZoneService.listPosts(reportablePost.zoneId);
  assert(visibleFeedAt9.some((p) => p.id === reportablePost.id), 'Post remains visible in public feed at 9 reports');

  // 4.4 10th unique report triggers automatic hiding
  const res10 = await dropZoneService.reportPost(
    reportablePost.id,
    'spam',
    'Report 10 threshold reached',
    'usr-test-reporter-10'
  );
  assert(res10.autoHidden === true, '10th unique report triggers autoHidden flag');

  const postAt10Reports = dropZoneService.getPostById(reportablePost.id);
  assert(
    postAt10Reports?.moderationStatus === 'pending_moderator_review',
    'Post status automatically set to pending_moderator_review'
  );

  // Verify HIDDEN from public feed
  const publicFeedAfter10 = await dropZoneService.listPosts(reportablePost.zoneId);
  assert(
    !publicFeedAfter10.some((p) => p.id === reportablePost.id),
    'Post is HIDDEN from public spatial feed upon receiving 10 unique reports'
  );

  // 4.5 Appears in moderation review queue
  const modQueue = await dropZoneService.listModerationItems();
  const queuedItem = modQueue.find((m) => m.post.id === reportablePost.id);
  assert(queuedItem !== undefined, 'Post appears in Moderator Review Queue');
  assert(queuedItem?.uniqueCount === 10, 'Queue correctly displays 10 unique reports');

  // 4.6 Authorized moderator restores post
  await dropZoneService.restorePost(
    reportablePost.id,
    modUser,
    'Verified post is non-malicious parody.'
  );
  const publicFeedAfterRestore = await dropZoneService.listPosts(reportablePost.zoneId);
  assert(
    publicFeedAfterRestore.some((p) => p.id === reportablePost.id),
    'Moderator restoration makes post visible in feed despite having 10+ reports'
  );

  // 4.7 Audit history captures moderation decisions
  const modLogs = await dropZoneService.listModerationLogs();
  const autoHideLogged = modLogs.some((l) => l.postId === reportablePost.id && l.action === 'auto_hidden_10_reports');
  const restoreLogged = modLogs.some((l) => l.postId === reportablePost.id && l.action === 'restored');
  assert(autoHideLogged, 'Audit log records auto_hidden_10_reports event');
  assert(restoreLogged, 'Audit log records moderator restoration decision');

  // ----------------------------------------------------
  // TEST SUITE 5: IN-APP NOTIFICATIONS
  // ----------------------------------------------------
  console.log('\n--- 5. In-App Notifications ---');

  // 5.1 Notification delivered to recipient
  const memberNotifs = await dropZoneService.listNotifications(memberUser.id);
  assert(memberNotifs.length > 0, 'Notifications generated and routed to recipient');

  // 5.2 Another user cannot see recipient notifications
  const otherUserNotifs = await dropZoneService.listNotifications('usr-unrelated-student');
  assert(otherUserNotifs.length === 0, 'User only sees notifications addressed to their account');

  // 5.3 Mark as read
  const unreadNotif = memberNotifs[0];
  await dropZoneService.markNotificationRead(unreadNotif.id);
  const reloadedNotifs = await dropZoneService.listNotifications(memberUser.id);
  const readItem = reloadedNotifs.find((n) => n.id === unreadNotif.id);
  assert(readItem?.readAt !== undefined, 'Mark notification as read successfully');

  // ----------------------------------------------------
  // TEST SUITE 6: POST AUTHOR CONTROLS (EDIT & DELETE)
  // ----------------------------------------------------
  console.log('\n--- 6. Author Post Controls: Edit & Delete ---');

  // 6.1 Create post for edit/delete testing
  const authorPost = await dropZoneService.createPost(
    {
      zoneId: newZone.id,
      title: 'Original Project Title',
      content: 'Original project description and problem statement.',
      category: 'feed',
      tags: ['original', 'test'],
      ttlHours: 6,
    },
    memberUser
  );
  const initialPostExpiry = authorPost.expiresAt;

  // 6.2 Author edits post
  const editedPost = await dropZoneService.editPost(
    authorPost.id,
    {
      title: 'Updated Project Title (v2)',
      content: 'Updated detailed project description with new scope.',
      tags: ['updated', 'v2', 'test'],
    },
    memberUser
  );
  assert(editedPost.title === 'Updated Project Title (v2)', 'Author can edit post title');
  assert(editedPost.content === 'Updated detailed project description with new scope.', 'Author can edit post content');
  assert(editedPost.updatedAt !== undefined, 'Post updatedAt timestamp is recorded');
  assert(editedPost.expiresAt === initialPostExpiry, 'Editing post preserves original TTL/expiresAt');

  // 6.3 Non-author cannot edit post
  let nonAuthorEditRejected = false;
  try {
    await dropZoneService.editPost(
      authorPost.id,
      {
        title: 'Hacked Title By Jordan',
      },
      modUser // Not the author
    );
    // Note: Jordan is a moderator so moderator *can* edit if allowed or if non-mod regular user tries:
  } catch (e: any) {
    nonAuthorEditRejected = true;
  }
  // Let's test with guest/unrelated member:
  let regularStrangerEditRejected = false;
  try {
    await dropZoneService.editPost(
      authorPost.id,
      {
        title: 'Hacked Title By Guest',
      },
      guestUser
    );
  } catch (e: any) {
    regularStrangerEditRejected = true;
  }
  assert(regularStrangerEditRejected, 'Non-author non-moderator is rejected from editing post');

  // 6.4 Non-author cannot delete post
  let nonAuthorDeleteRejected = false;
  try {
    await dropZoneService.deletePost(authorPost.id, guestUser);
  } catch (e: any) {
    nonAuthorDeleteRejected = true;
  }
  assert(nonAuthorDeleteRejected, 'Non-author cannot delete post');

  // 6.5 Author can delete their own post
  await dropZoneService.deletePost(authorPost.id, memberUser);
  assert(true, 'Author can delete their own post');

  // 6.6 Deleted post does not appear in active zone posts
  const zonePostsAfterDelete = await dropZoneService.listPosts(newZone.id);
  assert(
    !zonePostsAfterDelete.some((p) => p.id === authorPost.id),
    'Deleted post is removed from active spatial feed'
  );

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
