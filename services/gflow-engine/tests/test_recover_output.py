import json
import tempfile
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from recover_output import submitted_identity,recover_submitted_video

MEDIA='dfb2851a-f149-4b45-9fd7-b352e8b32b50'
WORKFLOW='66d3537c-aae9-4e35-bf8d-ee0a125b2189'
LOG=json.dumps({'event':'migrated.submit_observed_via_status','media_id':MEDIA,'workflow_id':WORKFLOW})
class RecoveryTests(unittest.TestCase):
 def test_ambiguous_or_reference_ids_never_choose_an_unrelated_clip(self):
  self.assertIsNone(submitted_identity(json.dumps({'event':'migrated.references_attached','media_id':MEDIA,'workflow_id':WORKFLOW})))
  other=json.dumps({'event':'migrated.submit_observed_via_status','media_id':'00000000-0000-0000-0000-000000000000','workflow_id':WORKFLOW})
  self.assertIsNone(submitted_identity(LOG+'\n'+other))
 def test_exact_download_uses_no_generation_command(self):
  with tempfile.TemporaryDirectory() as root:
   source=Path(root)/(MEDIA+'.mp4');source.write_bytes(b'x'*2048)
   destination=Path(root)/'job.mp4'
   def run(command,**kwargs):
    self.assertEqual(command[3:5],['data','download'])
    self.assertIn(MEDIA,command)
    return SimpleNamespace(returncode=0,stdout=json.dumps({'media_id':MEDIA,'workflow_id':WORKFLOW,'profile':'account-04','project_id':'project','path':str(source),'bytes':2048}))
   self.assertTrue(recover_submitted_video(LOG,'python','account-04','project',destination,{},run))
   self.assertEqual(destination.read_bytes(),source.read_bytes())
 def test_wrong_project_or_unobserved_generation_cannot_recover(self):
  def run(*args,**kwargs):return SimpleNamespace(returncode=0,stdout=json.dumps({'media_id':MEDIA,'workflow_id':WORKFLOW,'profile':'account-04','project_id':'another'}))
  self.assertFalse(recover_submitted_video(LOG,'python','account-04','project',Path('job.mp4'),{},run))
if __name__=='__main__':unittest.main()
