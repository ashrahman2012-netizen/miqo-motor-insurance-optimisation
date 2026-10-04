import test from "node:test";
import assert from "node:assert/strict";
import {renderLeadGenerationEmail} from "../src/email-template.ts";

test("renders professional multipart content without escaped newline artefacts",()=>{
  const email=renderLeadGenerationEmail({
    interestYesUrl:"https://miqos.example/interest/test/yes",
    interestNoUrl:"https://miqos.example/interest/test/no",
    unsubscribeUrl:"https://miqos.example/unsubscribe/test",
    privacyUrl:"https://miqos.example/privacy"
  });
  assert.match(email.subject,/paying more/i);
  assert.match(email.html,/Yes — check my options/);
  assert.match(email.html,/does not guarantee/i);
  assert.equal(email.text.includes("\\n"),false);
  assert.equal(email.text.includes("\n"),true);
});

test("escapes display inputs",()=>{
  const email=renderLeadGenerationEmail({
    firstName:"<script>",companyName:"MIQOS & Co",
    interestYesUrl:"https://example.test/y",interestNoUrl:"https://example.test/n",
    unsubscribeUrl:"https://example.test/u",privacyUrl:"https://example.test/p"
  });
  assert.doesNotMatch(email.html,/<script>/);
  assert.match(email.html,/MIQOS &amp; Co/);
});
