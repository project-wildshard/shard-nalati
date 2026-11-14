// Independent original author leaves, never a copied output snapshot.
import {parseShardfileField} from '@wildshard/format/shardSchema';
import content from '../../src/data/questContent.json' with {type:'json'};
import feats from '../../src/data/feats.json' with {type:'json'};
export function questSource(slug){return parseShardfileField('quests',{...content.quests,achievements:feats});}
