use crate::river::phase::{sub_phase, Phase};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::{
    cmp::Eq,
    collections::{HashMap, HashSet},
    fs,
    hash::{Hash, Hasher},
    path::PathBuf,
};
use strum_macros::EnumString;

use super::material::{get_constellation, get_material};
#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct Moai {
    #[serde(skip)]
    id: String, //唯一的id
    #[serde(default)]
    full_name: Option<String>, //全名
    #[serde(default)]
    base_time: Option<Phase>, //基准时间
    #[serde(default)]
    description: Option<String>, //描述
    #[serde(default)]
    juncture: Option<HashMap<String, Phase>>, //时间表
    #[serde(default)]
    material: Option<Vec<Material>>, //材料
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
    pub fn init(&mut self, id: &String) -> Result<(), String> {
        self.id = id.clone();
        self.init_material()?;
        Ok(())
    }

    fn init_material(&mut self) -> Result<(), String> {
        if let Some(ref material) = &self.material {
            for m in material {
                match m {
                    Material::Constellation => {
                        let mat = get_material::<_, _>(self, get_constellation)?;
                        if let Some(mat) = mat {
                            let props = self.extra_props.get_or_insert_with(HashMap::new);
                            props.insert(
                                m.to_string(),
                                serde_json::to_value(mat.to_string()).unwrap(),
                            );
                        }
                    }
                }
            }
        }
        Ok(())
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
}

#[derive(Deserialize, Serialize, Debug, Clone, EnumString, strum_macros::Display)]
pub enum Material {
    #[strum(serialize = "星座")]
    Constellation,
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
pub enum DateMode {
    Gregorian,
    Chinese,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Story {
    title: String,
    description: Option<String>,
    date_mode: Option<DateMode>, // 日期模式：格里高利历、中国农历
}
impl PartialEq for Story {
    fn eq(&self, other: &Self) -> bool {
        self.title == other.title && self.description == other.description
    }
}

impl Eq for Story {}
impl Story {
    pub fn date_mode(&self) -> Option<&DateMode> {
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
    story: Story,
    moai: Option<HashMap<String, Moai>>,
    moai_link: Option<HashMap<String, Vec<MoaiLink>>>,
    drift: Option<HashMap<String, Vec<Drift>>>,
    narrative: Option<HashMap<String, Narrative>>,
}

impl Dao {
    pub fn new(file_path: &PathBuf) -> Result<Self, String> {
        if !file_path.exists() {
            return Err(format!("Cannot find file: {}", file_path.display())); // Changed to display for better formatting
        }

        let ext = file_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_lowercase();

        if ext != "yaml" && ext != "yml" {
            return Err(format!(
                "Unsupported file type: {}, supported types are yaml and yml.",
                ext
            ));
        }

        let file_content = fs::read_to_string(file_path).map_err(|e| {
            format!(
                "Failed to read file content: {}, got error: {}",
                file_path.display(), // Changed to display for better formatting
                e
            )
        })?;

        let mut dao: Dao = serde_yaml::from_str(&file_content).map_err(|e| {
            format!(
                "Failed to parse {} as YAML, got error: {}",
                file_path.display(),
                e
            )
        })?; // Changed to display for better formatting

        if let Some(ref mut moais) = dao.moai {
            for (id, moai) in moais.iter_mut() {
                moai.init(id)?;
            }
        }

        dao.resolve_moai_links()?;
        dao.resolve_drifts()?;
        dao.resolve_narratives()?;
        Ok(dao)
    }

    pub fn get_moai_full_name(&self, id: &String) -> Result<String, String> {
        if let Some(ref moais) = &self.moai {
            let moai = moais
                .get(id)
                .ok_or_else(|| format!("Moai '{}' not found.", id))?;
            Ok(moai.full_name().clone())
        } else {
            Err("Moais are not defined.".to_string())
        }
    }

    fn resolve_moai_links(&mut self) -> Result<(), String> {
        if let Some(ref moais) = &self.moai {
            if let Some(ref mut links) = &mut self.moai_link {
                for link_vec in links.values_mut() {
                    for link in link_vec {
                        let (moai1_id, moai2_id) = link.moais();
                        moais.get(moai1_id).ok_or_else(|| {
                            format!("Moai '{}' referenced in moai_link not found", moai1_id)
                        })?;
                        moais.get(moai2_id).ok_or_else(|| {
                            format!("Moai '{}' referenced in moai_link not found", moai2_id)
                        })?;
                    }
                }
            }
        } else if self.moai_link.is_some() {
            return Err("Moai links exist but no moais are defined.".to_string());
        }
        Ok(())
    }

    fn resolve_drifts(&mut self) -> Result<(), String> {
        if let Some(ref moais) = &self.moai {
            if let Some(ref mut drifts) = &mut self.drift {
                for drift_vec in drifts.values_mut() {
                    for drift in drift_vec {
                        if let Some(moai_ids) = drift.moais() {
                            for moai_id in moai_ids {
                                moais.get(moai_id).ok_or_else(|| {
                                    format!("Moai '{}' referenced in drift not found.", moai_id)
                                })?;
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn resolve_narratives(&self) -> Result<(), String> {
        // Check if drift and moai exist and get their keys
        let drift_keys = match &self.drift {
            Some(drift) => drift.keys().collect::<HashSet<_>>(),
            None => HashSet::new(),
        };

        let moai_keys = match &self.moai {
            Some(moai) => moai.keys().collect::<HashSet<_>>(),
            None => HashSet::new(),
        };

        // Find duplicates using HashSet intersection
        let duplicates: Vec<_> = drift_keys.intersection(&moai_keys).collect();

        if !duplicates.is_empty() {
            return Err(format!(
                "Found duplicate keys in drift and moai: {:?}",
                duplicates
            ));
        }

        let all_id = drift_keys.union(&moai_keys).collect::<HashSet<_>>();

        if let Some(narratives) = &self.narrative {
            for (_, narrative) in narratives.iter() {
                if let Some(subject) = narrative.subject() {
                    for id in subject {
                        if !all_id.contains(&id) {
                            return Err(format!(
                                "Drift '{}' referenced in narrative not found.",
                                id
                            ));
                        }
                    }
                }
                if let Some(observer) = narrative.observer() {
                    for id in observer {
                        if !all_id.contains(&id) {
                            return Err(format!(
                                "Moai '{}' referenced in narrative not found.",
                                id
                            ));
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub fn story(&self) -> &Story {
        &self.story
    }

    fn get_moai(&self, id: &String) -> Option<&Moai> {
        self.moai.as_ref().and_then(|moais| moais.get(id))
    }

    pub fn get_all_moais(&self) -> Result<Option<HashMap<String, JsonValue>>, String> {
        let result = self
            .moai
            .as_ref()
            .map(|moais| {
                moais
                    .iter()
                    .map(|(id, moai)| {
                        let mut value = serde_json::to_value(moai)
                            .map_err(|e| format!("Failed to serialize Moai {}: {}", id, e))?;
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
                    .collect::<Result<HashMap<String, JsonValue>, String>>()
            })
            .transpose()?;
        Ok(result)
    }
    pub fn get_all_moai_links(&self) -> Result<Option<HashMap<String, serde_json::Value>>, String> {
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
                    .collect::<Result<HashMap<String, serde_json::Value>, String>>()
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
    ) -> Result<serde_json::Value, String> {
        if let Some(base_time) = moai.base_time() {
            let mut moai_json = serde_json::json!({
                "id": moai.id.clone(),
                "start_time_duration": sub_phase(&start_time, &base_time, self.date_mode())?,
            });
            if let Some(end_time) = end_time {
                let end_time_duration = sub_phase(&end_time, &base_time, self.date_mode())?;
                moai_json["end_time_duration"] =
                    serde_json::to_value(end_time_duration).map_err(|e| e.to_string())?;
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
    ) -> Result<serde_json::Value, String> {
        let mut json_obj = serde_json::json!({
            "title": title.clone(),
            "start_time": start_time,
            "start_time_dt": start_time.phase2iso8601()?,
        });
        if let Some(description) = description {
            json_obj["description"] = serde_json::json!(description);
        }
        if let Some(end_time) = end_time {
            json_obj["end_time"] = serde_json::to_value(end_time).map_err(|e| e.to_string())?;
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
                self.moai2json(self.get_moai(moai_id).unwrap(), start_time, end_time)
                    .ok()
            })
            .collect();
        if !moais_json.is_empty() {
            json_obj["moais"] = serde_json::json!(moais_json);
        }
        Ok(json_obj)
    }

    pub fn drift_flow(&self) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
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

    pub fn moai_flow(&self) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
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
    pub fn narrative_flow(&self) -> Result<HashMap<String, Vec<serde_json::Value>>, String> {
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

    // Get the date mode from the story
    pub fn date_mode(&self) -> Option<&DateMode> {
        self.story.date_mode()
    }
}
