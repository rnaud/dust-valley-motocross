// deploy-pages@v4 uses DefaultArtifactClient.listArtifacts(), not the REST API.
// Require two consecutive observations from that service before publishing.
module.exports = async function waitPagesArtifact({client,name,wait,log,attempts=12}) {
  let previousId=null;
  for(let attempt=0;attempt<attempts;attempt++){
    let artifact;
    try {
      const result=await client.listArtifacts();
      artifact=result.artifacts.find(a=>a.name===name);
    } catch {
      log('Artifact-service lookup failed; waiting before retry.');
    }
    if(artifact&&artifact.id===previousId){log('Pages artifact is visible to the deployment artifact service.');return artifact.id;}
    previousId=artifact?.id??null;
    log(`Waiting for deployment artifact metadata (${attempt+1}/${attempts}).`);
    if(attempt+1<attempts)await wait(5000);
  }
  throw Error(`Pages artifact ${name} was not consistently visible to the deployment artifact service.`);
};
