use super::errors::WeftError;
use serde::{Deserialize, Serialize};

/// Stable public representation. A relative phase points at another phase;
/// de-recursion adds every offset from the outer node to the anchor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Phase {
    pub base_time: Vec<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ref_time: Option<Box<Phase>>,
}

impl Phase {
    pub fn new(base_time: Vec<i64>, ref_time: Option<Box<Phase>>) -> Result<Self, WeftError> {
        Ok(Self {
            base_time,
            ref_time,
        })
    }

    pub fn from_yaml(value: &serde_yaml::Value) -> Result<Self, WeftError> {
        let sequence = value
            .as_sequence()
            .ok_or_else(|| WeftError::Schema("time must be a non-empty list".into()))?;
        if sequence.is_empty() {
            return Err(WeftError::Schema("time must be a non-empty list".into()));
        }
        let (components, reference) = match sequence.last() {
            Some(serde_yaml::Value::Sequence(_)) => {
                (&sequence[..sequence.len() - 1], sequence.last())
            }
            _ => (&sequence[..], None),
        };
        let mut base = Vec::with_capacity(components.len());
        for component in components {
            base.push(
                component
                    .as_i64()
                    .ok_or_else(|| WeftError::Schema("time components must be integers".into()))?,
            );
        }
        let reference = reference.map(Self::from_yaml).transpose()?.map(Box::new);
        Self::new(base, reference)
    }

    pub fn de_recursive(&self) -> Vec<i64> {
        let mut result = Vec::new();
        let mut phase = Some(self);
        while let Some(current) = phase {
            if current.base_time.len() > result.len() {
                result.resize(current.base_time.len(), 0);
            }
            for (target, value) in result.iter_mut().zip(&current.base_time) {
                *target += value;
            }
            phase = current.ref_time.as_deref();
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recursively_flattens_offsets() {
        let anchor = Phase::new(vec![1983, 1, 20], None).unwrap();
        let middle = Phase::new(vec![10, 2], Some(Box::new(anchor))).unwrap();
        let outer = Phase::new(vec![-3, 0, 5], Some(Box::new(middle))).unwrap();
        assert_eq!(outer.de_recursive(), vec![1990, 3, 25]);
    }

    #[test]
    fn parses_nested_story_syntax() {
        let value: serde_yaml::Value =
            serde_yaml::from_str("[2, 3, [10, 4, [1900, 1, 1]]]").unwrap();
        assert_eq!(
            Phase::from_yaml(&value).unwrap().de_recursive(),
            vec![1912, 8, 1]
        );
    }
}
