use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Pagination {
    pub count: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Serialize, Clone)]
pub struct TagResponse {
    pub tag: String,
    pub style: String,
}

