use crate::river::phase::{sub_phase, Phase};
use rhai::{CustomType, TypeBuilder};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::{
    cmp::Eq,
    collections::{HashMap, HashSet},
    fs,
    hash::{Hash, Hasher},
    path::PathBuf,
    sync::Arc,
};

use super::{
    aqueduct::{Aqueduct, MaterialPlugin},
    errors::RiverError,
};

#[derive(Deserialize, Serialize, Debug, Clone, Default, CustomType)]
#[rhai_type(name = "Moai")]
pub struct Moai {
    #[serde(skip)]
    id: String, //唯一的id

    #[serde(default)]
    tags: Option<Vec<String>>, //标签

    #[serde(default)]
    full_name: Option<String>, //全名
    #[serde(default)]
    base_time: Option<Phase>, //基准时间
    #[serde(default)]
    description: Option<String>, //描述
    #[serde(default, skip_serializing)]
    juncture: Option<HashMap<String, Phase>>, //时间表
    #[serde(default, skip_serializing)]
    material: Option<HashMap<String, String>>, //材料
    #[serde(default)]
    is: Option<Vec<String>>, //是什么
    #[serde(flatten)]
    extra_props: Option<HashMap<String, serde_json::Value>>, // 额外的 key
}

impl PartialEq for Moai {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}
impl Eq for Moai {}
impl Hash for Moai {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

impl Moai {
    pub fn init(&mut self, id: &String) -> Result<(), RiverError> {
        self.id = id.clone();
        Ok(())
    }

    pub fn tags(&self) -> Option<&Vec<String>> {
        self.tags.as_ref()
    }

    pub fn is(&self) -> Option<&Vec<String>> {
        self.is.as_ref()
    }

    pub fn material(&self) -> Option<&HashMap<String, String>> {
        self.material.as_ref()
    }

    pub fn full_name(&self) -> &String {
        self.full_name.as_ref().unwrap_or(&self.id)
    }
    pub fn id(&self) -> &String {
        &self.id
    }
    pub fn base_time(&self) -> Option<&Phase> {
        self.base_time.as_ref()
    }

    pub fn juncture(&self) -> Option<&HashMap<String, Phase>> {
        self.juncture.as_ref()
    }
    pub fn extra_props(&self) -> Option<&HashMap<String, JsonValue>> {
        self.extra_props.as_ref()
    }

    pub fn insert_extra_props(&mut self, key: String, value: JsonValue) {
        if let Some(props) = &mut self.extra_props {
            props.insert(key, value);
        } else {
            self.extra_props = Some(HashMap::new());
            self.extra_props.as_mut().unwrap().insert(key, value);
        }
    }
}

#[derive(Deserialize, Debug, Clone)]
pub struct MoaiLink {
    moais: (String, String), // Tuple of Moai IDs from YAML
    relations: String,
    bidirectional: Option<bool>,
}

impl MoaiLink {
    // 获取 Moai ID 元组
    pub fn moais(&self) -> &(String, String) {
        &self.moais
    }

    // 获取关系字符串
    pub fn relations(&self) -> &str {
        &self.relations
    }

    // 获取可选的双向标识
    pub fn bidirectional(&self) -> bool {
        self.bidirectional.unwrap_or(false) // 返回值或如果为None则为false
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Story {
    title: String,
    summary: Option<String>,         //简短的一句话介绍
    description: Option<String>,     //完整文案
    main_moais: Option<Vec<String>>, // 主moai
    date_mode: Option<String>,       // 日期模式：格里高利历、中国农历
}
impl PartialEq for Story {
    fn eq(&self, other: &Self) -> bool {
        self.title == other.title && self.description == other.description
    }
}

impl Eq for Story {}
impl Story {
    pub fn date_mode(&self) -> Option<&String> {
        self.date_mode.as_ref()
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Drift {
    title: String,
    start_time: Phase,           // yaml 解析时间格式
    end_time: Option<Phase>,     // yaml 解析时间格式
    description: Option<String>, // 描述
    moais: Option<Vec<String>>,  // 参与
}

impl Drift {
    pub fn moais(&self) -> Option<&Vec<String>> {
        self.moais.as_ref()
    }
    pub fn title(&self) -> &String {
        &self.title
    }
    pub fn description(&self) -> Option<&String> {
        self.description.as_ref()
    }
    pub fn start_time(&self) -> &Phase {
        &self.start_time
    }

    pub fn end_time(&self) -> Option<&Phase> {
        self.end_time.as_ref()
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Narrative {
    subject: Option<Vec<String>>,
    observer: Option<Vec<String>>,
}

impl Narrative {
    pub fn subject(&self) -> Option<&Vec<String>> {
        self.subject.as_ref()
    }
    pub fn observer(&self) -> Option<&Vec<String>> {
        self.observer.as_ref()
    }
}

#[derive(Deserialize, Debug)]
pub struct Dao {
    //从yaml文件中读取
    story: Option<Story>,
    moai: Option<HashMap<String, Moai>>,
    moai_link: Option<HashMap<String, Vec<MoaiLink>>>,
    drift: Option<HashMap<String, Vec<Drift>>>,
    narrative: Option<HashMap<String, Narrative>>,
    aqueduct: Option<Vec<PathBuf>>,

    //计算得到
    tagged_moais: Option<HashMap<String, HashSet<String>>>,
    was_moais: Option<HashMap<String, HashSet<String>>>,
}

impl Dao {
    pub fn new(file_path: &PathBuf) -> Result<Self, RiverError> {
        if !file_path.exists() {
            return Err(RiverError::FileNotFound(
                file_path.to_string_lossy().to_string(),
            ));
        }

        let ext = file_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_lowercase();

        if ext != "yaml" && ext != "yml" {
            return Err(RiverError::UnsupportedFileType(ext.to_string()));
        }

        let file_content =
            fs::read_to_string(file_path).map_err(|e| RiverError::FailedToReadFileContent(e))?;

        let mut dao: Dao =
            serde_yaml::from_str(&file_content).map_err(|e| RiverError::FailedToParseYaml(e))?;

        dao.tagged_moais = Some(HashMap::new());
        dao.was_moais = Some(HashMap::new());
        Ok(dao)
    }

    pub fn resolve(&mut self, aqueduct: &Aqueduct) -> Result<(), RiverError> {
        self.resolve_story(aqueduct)?;
        self.resolve_moai(aqueduct)?;
        self.resolve_moai_links()?;
        self.resolve_drifts()?;
        self.resolve_narratives()?;
        Ok(())
    }

    pub fn aqueduct(&self) -> Option<&Vec<PathBuf>> {
        self.aqueduct.as_ref()
    }

    fn resolve_story(&mut self, aqueduct: &Aqueduct) -> Result<(), RiverError> {
        if let Some(ref story) = &self.story {
            if let Some(date_mode) = story.date_mode() {
                if date_mode != "Gregorian" {
                    if !aqueduct.has_plugin(date_mode)? {
                        return Err(RiverError::InvalidDateMode(date_mode.clone()));
                    }
                }
            }
        }
        Ok(())
    }

    fn resolve_moai(&mut self, aqueduct: &Aqueduct) -> Result<(), RiverError> {
        // 注册 id
        if let Some(ref mut moais) = &mut self.moai {
            for (id, moai) in moais.iter_mut() {
                moai.init(id)?;
            }
        }

        if let Some(ref moais) = &self.moai {
            // First, collect all material operations needed
            let mut operations = Vec::new();

            for (id, moai) in moais.iter() {
                if let Some(materials) = moai.material() {
                    for (material_name, material_func) in materials {
                        operations
                            .push((id.clone(), (material_name.clone(), material_func.clone())));
                    }
                }
                if let Some(is) = moai.is() {
                    for is_id in is {
                        if !self.moai.as_ref().unwrap().contains_key(is_id) {
                            return Err(RiverError::MoaiNotDefined(is_id.clone()));
                        }
                        if let Some(is_set) = self.was_moais.as_mut().unwrap().get_mut(is_id) {
                            is_set.insert(id.clone());
                        } else {
                            self.was_moais
                                .as_mut()
                                .unwrap()
                                .insert(is_id.clone(), HashSet::new());
                        }
                    }
                }

                if let Some(tags) = moai.tags() {
                    for tag in tags {
                        if let Some(tag_set) = self.tagged_moais.as_mut().unwrap().get_mut(tag) {
                            tag_set.insert(id.clone());
                        } else {
                            self.tagged_moais
                                .as_mut()
                                .unwrap()
                                .insert(tag.clone(), HashSet::new());
                        }
                    }
                }
            }

            // Then process them
            for (id, (material_name, material_func)) in operations {
                let moai_ref = self.moai.as_ref().unwrap().get(&id).unwrap(); //FIXME: 这里需要检查moai是否存在
                let res = aqueduct
                    .call_with::<MaterialPlugin>(&material_func, Arc::new(moai_ref.clone()))?;
                if let Some(res) = res {
                    if let Some(moai) = self.moai.as_mut().unwrap().get_mut(&id) {
                        moai.insert_extra_props(material_name, res);
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_moai_full_name(&self, id: &String) -> Result<String, RiverError> {
        let moai = self.get_moai(id)?;
        Ok(moai.full_name().clone())
    }

    fn resolve_moai_links(&self) -> Result<(), RiverError> {
        if let Some(ref links) = &self.moai_link {
            for link_vec in links.values() {
                for link in link_vec {
                    let (moai1_id, moai2_id) = link.moais();
                    //检查moai_link中的moai是否存在
                    self.get_moai(moai1_id)?;
                    self.get_moai(moai2_id)?;
                }
            }
        }
        Ok(())
    }

    fn resolve_drifts(&self) -> Result<(), RiverError> {
        if let Some(ref drifts) = &self.drift {
            for drift_vec in drifts.values() {
                for drift in drift_vec {
                    if let Some(moai_ids) = drift.moais() {
                        for moai_id in moai_ids {
                            //检查drift中的moai是否存在
                            self.get_moai(moai_id)?;
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn resolve_narratives(&self) -> Result<(), RiverError> {
        let drift_keys = match &self.drift {
            Some(drift) => drift.keys().collect::<HashSet<&String>>(),
            None => HashSet::<&String>::new(),
        };

        let moai_keys = match &self.moai {
            Some(moai) => moai.keys().collect::<HashSet<&String>>(),
            None => HashSet::<&String>::new(),
        };

        // Find duplicates using HashSet intersection
        let duplicates: Vec<&String> = drift_keys
            .intersection(&moai_keys)
            .map(|&key| key)
            .collect();

        if !duplicates.is_empty() {
            return Err(RiverError::DuplicateKeysInDriftAndMoai(
                duplicates.iter().map(|s| s.to_string()).collect(),
            ));
        }

        let all_id = drift_keys.union(&moai_keys).collect::<HashSet<_>>();

        if let Some(narratives) = &self.narrative {
            for (_, narrative) in narratives.iter() {
                if let Some(subject) = narrative.subject() {
                    for id in subject {
                        if !all_id.contains(&id) {
                            return Err(RiverError::EntityNotFoundInNarrative(id.clone()));
                        }
                    }
                }
                if let Some(observer) = narrative.observer() {
                    for id in observer {
                        if !all_id.contains(&id) {
                            return Err(RiverError::EntityNotFoundInNarrative(id.clone()));
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub fn story(&self) -> Option<&Story> {
        self.story.as_ref()
    }

    fn get_moai(&self, id: &String) -> Result<&Moai, RiverError> {
        if let Some(ref moais) = &self.moai {
            let moai = moais
                .get(id)
                .ok_or_else(|| RiverError::MoaiNotDefined(id.clone()))?;
            Ok(moai)
        } else {
            Err(RiverError::MoaisNotDefined)
        }
    }

    pub fn get_all_moais(&self) -> Result<Option<HashMap<String, JsonValue>>, RiverError> {
        let result = self
            .moai
            .as_ref()
            .map(|moais| {
                moais
                    .iter()
                    .map(|(id, moai)| {
                        let mut value = serde_json::to_value(moai)
                            .map_err(|e| RiverError::FailedToSerializeMoai(e))?;
                        if let JsonValue::Object(ref mut map) = &mut value {
                            if map.get("full_name").map_or(true, |v| {
                                v.is_null() || v.as_str().is_some_and(|s| s.is_empty())
                            }) {
                                map.insert("full_name".to_owned(), JsonValue::String(id.clone()));
                            }
                        }
                        Ok((id.clone(), value))
                    })
                    // 显式指定collect的类型参数
                    .collect::<Result<HashMap<String, JsonValue>, RiverError>>()
            })
            .transpose()?;
        Ok(result)
    }

    pub fn get_all_moai_links(
        &self,
    ) -> Result<Option<HashMap<String, serde_json::Value>>, RiverError> {
        let result = self
            .moai_link
            .as_ref()
            .map(|links| {
                links
                    .iter()
                    .map(|(key, links)| {
                        // Track unique moais for nodes
                        let mut unique_moais: HashSet<String> = HashSet::new();
                        let mut moai_lines: Vec<serde_json::Value> = Vec::new();

                        // Process all links in this category
                        for link in links {
                            let (id1, id2) = link.moais();
                            unique_moais.insert(id1.clone());
                            unique_moais.insert(id2.clone());
                            moai_lines.push(serde_json::json!({
                                "from": id1,
                                "to": id2,
                                "relations": link.relations(),
                                "bidirectional": link.bidirectional()
                            }));
                        }

                        let mut moai_nodes: Vec<serde_json::Value> = Vec::new();
                        for id in &unique_moais {
                            // Handle the Result explicitly instead of using ?
                            match self.get_moai_full_name(&id) {
                                Ok(full_name) => {
                                    moai_nodes.push(serde_json::json!({
                                        "id": id,
                                        "text": full_name
                                    }));
                                }
                                Err(err) => return Err(err), // Return the error from the closure
                            }
                        }

                        // Create MoaiLinkContextType structure
                        let moai_link_context = serde_json::json!({
                            "moai_nodes": moai_nodes,
                            "moai_links": moai_lines
                        });

                        Ok((key.clone(), moai_link_context))
                    })
                    .collect::<Result<HashMap<String, serde_json::Value>, RiverError>>()
                // Collect into Result
            })
            .transpose()?; // Handle the Option<Result<...>> -> Result<Option<...>>

        Ok(result)
    }

    fn moai2json(
        &self,
        moai: &Moai,
        start_time: &Phase,
        end_time: Option<&Phase>,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<serde_json::Value, RiverError> {
        if let Some(base_time) = moai.base_time() {
            let date_mode = self.date_mode().map_or("Gregorian", |s| s);
            let mut moai_json = serde_json::json!({
                "id": moai.id.clone(),
                "start_time_duration": sub_phase(&start_time, &base_time, date_mode, aqueduct)?,
            });
            if let Some(end_time) = end_time {
                let end_time_duration = sub_phase(&end_time, &base_time, &date_mode, aqueduct)?;
                moai_json["end_time_duration"] =
                    serde_json::to_value(end_time_duration).map_err(|e| RiverError::from(e))?;
            }
            Ok(moai_json)
        } else {
            Ok(serde_json::json!({
                "id": moai.id.clone(),
            }))
        }
    }

    fn drift2json(
        &self,
        title: &String,
        description: Option<&String>,
        involved_moais: Option<&Vec<String>>,
        start_time: &Phase,
        end_time: Option<&Phase>,
        observed_moais: Option<&Vec<String>>,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<serde_json::Value, RiverError> {
        let mut json_obj = serde_json::json!({
            "title": title.clone(),
            "start_time": start_time,
            "start_time_dt": start_time.phase2iso8601()?,
        });
        if let Some(description) = description {
            json_obj["description"] = serde_json::json!(description);
        }
        if let Some(end_time) = end_time {
            json_obj["end_time"] =
                serde_json::to_value(end_time).map_err(|e| RiverError::from(e))?;
            json_obj["end_time_dt"] = serde_json::Value::String(end_time.phase2iso8601()?);
        }
        let mut moais = Vec::new();
        if let Some(moai) = involved_moais {
            moais.extend(moai);
        }
        if let Some(extra_moais) = observed_moais {
            moais.extend(extra_moais);
        }
        moais.sort(); // Sort alphabetically
        moais.dedup(); // Remove duplicates (works on sorted data)
        let moais_json: Vec<_> = moais
            .into_iter()
            .filter_map(|moai_id| {
                self.moai2json(
                    self.get_moai(moai_id).unwrap(),
                    start_time,
                    end_time,
                    aqueduct,
                )
                .ok()
            })
            .collect();
        if !moais_json.is_empty() {
            json_obj["moais"] = serde_json::json!(moais_json);
        }
        Ok(json_obj)
    }

    pub fn drift_flow(
        &self,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<HashMap<String, Vec<serde_json::Value>>, RiverError> {
        let mut result_map: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
        if let Some(cate_drifts) = self.drift.as_ref() {
            for (cate, drifts) in cate_drifts {
                let mut flow_vec: Vec<serde_json::Value> = Vec::new();
                for drift in drifts {
                    // Build the complete JSON object at once
                    let json_obj = self.drift2json(
                        drift.title(),
                        drift.description(),
                        drift.moais(),
                        drift.start_time(),
                        drift.end_time(),
                        None,
                        aqueduct,
                    )?;
                    flow_vec.push(json_obj);
                }
                flow_vec.sort_by(|a, b| {
                    let a_dt = a["start_time_dt"].as_str().unwrap_or("");
                    let b_dt = b["start_time_dt"].as_str().unwrap_or("");
                    a_dt.cmp(b_dt)
                });
                if flow_vec.len() > 0 {
                    result_map.insert(cate.clone(), flow_vec);
                }
            }
        }
        Ok(result_map)
    }

    pub fn moai_flow(
        &self,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<HashMap<String, Vec<serde_json::Value>>, RiverError> {
        let mut result_map: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
        let all_drifts = self
            .drift
            .as_ref()
            .map(|drifts| drifts.values().flatten().collect::<Vec<_>>())
            .unwrap_or_default();
        if let Some(cate_moais) = self.moai.as_ref() {
            for (id, _) in cate_moais {
                let mut flow_vec: Vec<serde_json::Value> = Vec::new();
                for drift in &all_drifts {
                    if let Some(moai_ids) = drift.moais() {
                        if moai_ids.contains(id) {
                            let json_obj = self.drift2json(
                                drift.title(),
                                drift.description(),
                                drift.moais(),
                                drift.start_time(),
                                drift.end_time(),
                                Some(&vec![id.clone()]),
                                aqueduct,
                            )?;
                            flow_vec.push(json_obj);
                        }
                    }
                }

                // Sort flow_vec by start_time_dt
                flow_vec.sort_by(|a, b| {
                    let a_dt = a["start_time_dt"].as_str().unwrap_or("");
                    let b_dt = b["start_time_dt"].as_str().unwrap_or("");
                    a_dt.cmp(b_dt)
                });
                if flow_vec.len() > 0 {
                    result_map.insert(id.clone(), flow_vec);
                }
            }
        }
        Ok(result_map)
    }
    pub fn narrative_flow(
        &self,
        aqueduct: Option<&Aqueduct>,
    ) -> Result<HashMap<String, Vec<serde_json::Value>>, RiverError> {
        let mut result_map: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
        if let Some(narratives) = &self.narrative {
            for (id, narrative) in narratives.iter() {
                if let Some(subject) = narrative.subject() {
                    let mut flow_vec: Vec<serde_json::Value> = Vec::new();
                    for id in subject {
                        if self.drift.as_ref().unwrap().contains_key(id) {
                            let drifts = self.drift.as_ref().unwrap().get(id).unwrap();
                            for drift in drifts {
                                let json_obj = self.drift2json(
                                    drift.title(),
                                    drift.description(),
                                    drift.moais(),
                                    drift.start_time(),
                                    drift.end_time(),
                                    narrative.observer(),
                                    aqueduct,
                                )?;
                                flow_vec.push(json_obj);
                            }
                        } else if self.moai.as_ref().unwrap().contains_key(id) {
                            let moai = self.moai.as_ref().unwrap().get(id).unwrap();
                            if let Some(juncture) = moai.juncture() {
                                for (title, start_time) in juncture {
                                    let json_obj = self.drift2json(
                                        title,
                                        None,
                                        Some(&vec![moai.id().clone()]),
                                        start_time,
                                        None,
                                        narrative.observer(),
                                        aqueduct,
                                    )?;
                                    flow_vec.push(json_obj);
                                }
                            }
                        }
                    }
                    flow_vec.sort_by(|a, b| {
                        let a_dt = a["start_time_dt"].as_str().unwrap_or("");
                        let b_dt = b["start_time_dt"].as_str().unwrap_or("");
                        a_dt.cmp(b_dt)
                    });
                    if !flow_vec.is_empty() {
                        result_map.insert(id.clone(), flow_vec);
                    }
                }
            }
        }
        Ok(result_map)
    }

    pub fn date_mode(&self) -> Option<&String> {
        if let Some(ref story) = &self.story {
            story.date_mode()
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_dao() {
        let file_path = PathBuf::from("/home/guozr/CODE/River/examples/story_1.yml");
        let dao = Dao::new(&file_path);
        println!("{:?}", dao.as_ref().err());
        let a = dao.unwrap().get_all_moais();
        println!("{:?}", a);
    }
}
