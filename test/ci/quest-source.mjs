// Independent original author leaves, never a copied product snapshot.
import {parseShardfileField} from '@wildshard/engine/host/shardfile';
import content from '../../src/shards/nalati-grasslands/data/questContent.json' with {type:'json'};
import feats from '../../src/shards/nalati-grasslands/data/feats.json' with {type:'json'};
export function questSource(slug){return parseShardfileField('quests',{...content.quests,achievements:feats});}
